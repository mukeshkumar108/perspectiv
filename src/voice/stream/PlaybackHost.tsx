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
  flush: () => void;
};

type Props = {
  onState: (state: PlaybackState) => void;
  onError?: (message: string) => void;
};

const PAGE = `<!doctype html><html><body><script>
var ctx, next = 0, srcs = [], playing = false;
function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
function ensure(){
  if(!ctx){ var C = window.AudioContext || window.webkitAudioContext; ctx = new C(); }
  if(ctx.state !== 'running'){ ctx.resume(); }
}
function setPlaying(p){ if(p !== playing){ playing = p; post({t: p ? 'playing' : 'idle'}); } }
function onMsg(e){
  var m; try { m = JSON.parse(e.data); } catch(x){ return; }
  if(m.t === 'init'){ ensure(); post({t:'ready', state: ctx.state}); }
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
    var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
    var lead = next <= ctx.currentTime ? 0.06 : 0;
    var at = Math.max(next, ctx.currentTime + lead);
    src.start(at); next = at + buf.duration;
    srcs.push(src); setPlaying(true);
    src.onended = function(){
      var k = srcs.indexOf(src);
      if(k < 0) return;
      srcs.splice(k, 1);
      if(srcs.length === 0) setPlaying(false);
    };
  }
  else if(m.t === 'flush'){
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
  { onState, onError },
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
      flush: () => send({ t: 'flush' }),
    }),
    [send],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let m: { t: string; m?: string };
      try {
        m = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (m.t === 'booted') {
        booted.current = true;
        queue.current.splice(0).forEach((text) => webRef.current?.postMessage(text));
      } else if (m.t === 'ready') {
        readyWaiters.current.splice(0).forEach((resolve) => resolve(true));
      } else if (m.t === 'playing' || m.t === 'idle') {
        onState(m.t);
      } else if (m.t === 'err') {
        onError?.(m.m ?? 'audio page error');
      }
    },
    [onError, onState],
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
