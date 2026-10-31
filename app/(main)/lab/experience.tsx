import { useState } from 'react';
import { View } from 'react-native';

import { ExperienceOfferCard } from '@/src/components/ExperienceOfferCard';
import { VoiceDemoBreathingOverlay } from '@/src/components/VoiceDemoBreathingOverlay';
import { ScreenContainer, ScreenHeader, Text, spacing } from '@/src/ui';
import { useRouter } from 'expo-router';
import { resumeLine } from '@/src/voice/stream/experiences';

/** Developer harness: the offer card and the breathing overlay on their own, without a voice call. What the companion would be told is shown at the bottom. */
export default function ExperienceLab() {
  const router = useRouter();
  const [stage, setStage] = useState<'offer' | 'running' | 'done'>('offer');
  const [told, setTold] = useState('');
  return (
    <ScreenContainer>
      <ScreenHeader onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: spacing.md }}>
        {stage === 'offer' ? (
          <ExperienceOfferCard offer={{ offerId: 'lab', experienceId: 'breathing-4-7-8', title: '4-7-8 breathing', status: 'offered' }} onAccept={() => setStage('running')} onDecline={() => { setTold('declined'); setStage('done'); }} />
        ) : null}
        <VoiceDemoBreathingOverlay
          visible={stage === 'running'}
          slug="breathing-4-7-8"
          onComplete={({ outcome, durationSec }) => { setTold(resumeLine(outcome, '4-7-8 breathing', durationSec)); setStage('done'); }}
          onDismiss={() => setStage((s) => (s === 'running' ? 'done' : s))}
        />
        {stage === 'done' ? <Text variant="body" center>{told || '[closed without doing it]'}</Text> : null}
      </View>
    </ScreenContainer>
  );
}
