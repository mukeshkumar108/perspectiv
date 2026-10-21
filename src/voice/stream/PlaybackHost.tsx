import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Assistant audio plays through a hidden WebView running Web Audio. Chunks are scheduled back to
// back on the audio clock (gap free), and flush() stops every queued source at once. This is the
// playback path that works in Expo Go; there is no PCM queue in expo-audio itself.

export type PlaybackState = 'playing' | 'idle';

export type PlaybackHandle = {
  /** Resolves true once the hidden audio page is running. */
  ensureReady: () => Promise<boolean>;
  enqueue: (base64Pcm16: string, sampleRate: number) => void;
  /** Start anything still held in the pre-roll buffer (the reply has finished arriving). */
  drain: () => void;
  flush: () => void;
};

type Props = {
  onState: (state: PlaybackState) => void;
  onLevel?: (level: number) => void;
  onDiag?: (info: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

const PAGE = `<!doctype html><html><body><script>
var ctx, master, analyser, next = 0, srcs = [], playing = false;
var hold = [], holdSecs = 0, holdTimer = null, levelTimer = null, levelBuf = null;
var PREROLL_S = 0.35, MAX_HOLD_MS = 400;
function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
function ensure(){
  // Note: a silent looping <audio> element (the usual iOS trick to ignore the silent switch) puts WebKit's audio session in
  // playback-only mode, which stops the microphone. So it is deliberately not used; the ringer must be on.
  if(!ctx){
    var C = window.AudioContext || window.webkitAudioContext; ctx = new C();
    ctx.onstatechange = function(){ post({t:'diag', what:'ctx-state', state: ctx.state, cur: ctx.currentTime}); };
    master = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    master.connect(ctx.destination); master.connect(analyser);
    levelBuf = new Float32Array(analyser.fftSize);
  }
  if(ctx.state !== 'running'){ ctx.resume(); }
}
function setPlaying(p){
  if(p === playing) return;
  playing = p;
  post({t: p ? 'playing' : 'idle'});
  if(p && !levelTimer){
    levelTimer = setInterval(function(){
      analyser.getFloatTimeDomainData(levelBuf);
      var s = 0; for(var i = 0; i < levelBuf.length; i++) s += levelBuf[i] * levelBuf[i];
      post({t:'level', v: Math.sqrt(s / levelBuf.length)});
    }, 66);
  } else if(!p && levelTimer){ clearInterval(levelTimer); levelTimer = null; post({t:'level', v: 0}); }
}
function play(buf){
  var src = ctx.createBufferSource(); src.buffer = buf; src.connect(master);
  var at = Math.max(next, ctx.currentTime + 0.03);
  src.start(at); next = at + buf.duration;
  srcs.push(src); setPlaying(true);
  post({t:'diag', what:'play', state: ctx.state, cur: Math.round(ctx.currentTime*100)/100, lead: Math.round((at-ctx.currentTime)*100)/100, dur: Math.round(buf.duration*100)/100, rate: ctx.sampleRate, out: ctx.outputLatency});
  src.onended = function(){
    var k = srcs.indexOf(src);
    if(k < 0) return;
    srcs.splice(k, 1);
    if(srcs.length === 0 && hold.length === 0) setPlaying(false);
  };
}
function release(){
  if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
  var h = hold; hold = []; holdSecs = 0;
  h.forEach(play);
}
function onMsg(e){
  var m; try { m = JSON.parse(e.data); } catch(x){ return; }
  if(m.t === 'init'){ ensure(); post({t:'ready', state: ctx.state}); post({t:'diag', what:'init', state: ctx.state, rate: ctx.sampleRate, base: ctx.baseLatency, out: ctx.outputLatency}); }
  else if(m.t === 'chunk'){
    ensure();
    var bin = atob(m.d), n = bin.length >> 1;
    if(!n) return;
    var buf = ctx.createBuffer(1, n, m.rate), ch = buf.getChannelData(0);
    for(var i = 0; i < n; i++){
      var s = (bin.charCodeAt(2*i+1) << 8) | bin.charCodeAt(2*i);
      if(s >= 32768) s -= 65536;
      ch[i] = s / 32768;
    }
    var continuing = srcs.length > 0 && next > ctx.currentTime + 0.02;
    if(continuing && hold.length === 0){ play(buf); }
    else {
      // fresh start or underrun: build a little cushion so slow text-to-speech does not stutter
      hold.push(buf); holdSecs += buf.duration;
      if(holdSecs >= PREROLL_S) release();
      else if(!holdTimer) holdTimer = setTimeout(release, MAX_HOLD_MS);
    }
  }
  else if(m.t === 'drain'){ release(); }
  else if(m.t === 'flush'){
    if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    hold = []; holdSecs = 0;
    var old = srcs; srcs = []; next = 0;
    old.forEach(function(s){ try { s.stop(); } catch(x){} });
    setPlaying(false);
  }
}
window.onerror = function(msg){ post({t:'err', m: String(msg)}); };
document.addEventListener('message', onMsg); window.addEventListener('message', onMsg);
post({t:'booted'});
</script></body></html>`;

export const VoicePlaybackHost = forwardRef<PlaybackHandle, Props>(function VoicePlaybackHost(
  { onState, onLevel, onDiag, onError },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const booted = useRef(false);
  const queue = useRef<string[]>([]);
  const readyWaiters = useRef<((ok: boolean) => void)[]>([]);

  const send = useCallback((payload: object) => {
    const text = JSON.stringify(payload);
    if (booted.current) webRef.current?.postMessage(text);
    else queue.current.push(text);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      ensureReady: () =>
        new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), 4000);
          readyWaiters.current.push((ok) => {
            clearTimeout(timer);
            resolve(ok);
          });
          send({ t: 'init' });
        }),
      enqueue: (d, rate) => send({ t: 'chunk', d, rate }),
      drain: () => send({ t: 'drain' }),
      flush: () => send({ t: 'flush' }),
    }),
    [send],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let m: { t: string; m?: string; v?: number; [key: string]: unknown };
      try {
        m = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (m.t === 'booted') {
        // A second 'booted' during a session means the hidden audio page reloaded (iOS can drop it), losing queued audio.
        onDiag?.({ what: 'booted', again: booted.current });
        booted.current = true;
        queue.current.splice(0).forEach((text) => webRef.current?.postMessage(text));
      } else if (m.t === 'ready') {
        readyWaiters.current.splice(0).forEach((resolve) => resolve(true));
      } else if (m.t === 'playing' || m.t === 'idle') {
        onState(m.t);
      } else if (m.t === 'level') {
        onLevel?.(m.v ?? 0);
      } else if (m.t === 'diag') {
        onDiag?.(m as Record<string, unknown>);
      } else if (m.t === 'err') {
        onError?.(m.m ?? 'audio page error');
      }
    },
    [onError, onLevel, onDiag, onState],
  );

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: PAGE, baseUrl: 'https://localhost/' }}
        onMessage={onMessage}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
      />
    </View>
  );
});
