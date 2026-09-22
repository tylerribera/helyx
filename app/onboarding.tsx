import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Screen, Small, Title } from '@/components/ui';
import { Goal, type ExperienceLevel, type OnboardingProfile } from '@/schema';
import { useProfile } from '@/state/profile';
import { colors, radius, space, type } from '@/theme';

/**
 * Free onboarding.
 *
 * Short on purpose. Its job is to personalise the home page within a minute,
 * not to qualify a buyer -- the longer, more specific Core onboarding is a
 * separate pass and belongs behind the paywall.
 *
 * Structurally this is a step machine over a fixed list of questions. The
 * developer taking this over will add the animation and polish; what matters
 * here is that each step writes into a schema-validated profile, and that the
 * two safety questions are asked before anything is ever suggested.
 */

type Step = 'experience' | 'goals' | 'safety' | 'done';

const EXPERIENCE: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: 'new', label: 'Totally new', hint: 'Never taken anything like this' },
  { value: 'some', label: 'A little', hint: 'Caffeine, maybe a supplement or two' },
  { value: 'experienced', label: 'Experienced', hint: 'I run stacks and track what works' },
  { value: 'advanced', label: 'Deep in it', hint: 'I read the papers' },
];

const GOALS = Goal.options;

export default function Onboarding() {
  const router = useRouter();
  const { save } = useProfile();

  const [step, setStep] = useState<Step>('experience');
  const [experience, setExperience] = useState<ExperienceLevel>('some');
  const [goals, setGoals] = useState<string[]>([]);
  const [gray, setGray] = useState(false);
  const [sport, setSport] = useState(false);

  function toggleGoal(goal: string) {
    setGoals((current) =>
      current.includes(goal)
        ? current.filter((g) => g !== goal)
        : current.length >= 3
          ? current // capped at three; ranking matters more than breadth
          : [...current, goal],
    );
  }

  async function finish() {
    const profile: OnboardingProfile = {
      experience,
      goals: goals as OnboardingProfile['goals'],
      willingToConsiderGrayMarket: gray,
      competesInSport: sport,
      sensitivities: [],
      takesPrescriptionMedication: false,
      completedAt: new Date().toISOString().slice(0, 10),
    };
    await save(profile);
    router.replace('/');
  }

  return (
    <Screen>
      {step === 'experience' && (
        <>
          <Title>How familiar are you?</Title>
          <Small muted>This sets how much context we give you, not what you can see.</Small>
          {EXPERIENCE.map((option) => (
            <Choice
              key={option.value}
              label={option.label}
              hint={option.hint}
              selected={experience === option.value}
              onPress={() => setExperience(option.value)}
            />
          ))}
          <Next label="Continue" onPress={() => setStep('goals')} />
        </>
      )}

      {step === 'goals' && (
        <>
          <Title>What are you after?</Title>
          <Small muted>Pick up to three. Order matters — the first counts most.</Small>
          <View style={s.chips}>
            {GOALS.map((goal) => (
              <Pressable key={goal} onPress={() => toggleGoal(goal)}>
                <View style={[s.chip, goals.includes(goal) && s.chipOn]}>
                  <Text style={[s.chipText, goals.includes(goal) && s.chipTextOn]}>
                    {goals.includes(goal) ? `${goals.indexOf(goal) + 1}. ` : ''}
                    {goal.replace(/-/g, ' ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Next label="Continue" onPress={() => setStep('safety')} disabled={goals.length === 0} />
        </>
      )}

      {step === 'safety' && (
        <>
          <Title>Two safety questions</Title>
          <Small muted>
            These filter what you are shown. A compound ruled out here is never suggested to you,
            no matter how well it matches your goals.
          </Small>

          <Choice
            label="I compete in tested sport"
            hint="Hides anything banned by WADA, the NCAA, or a pro league"
            selected={sport}
            onPress={() => setSport((v) => !v)}
          />
          <Choice
            label="Show gray-market and research compounds"
            hint="Off by default. These carry real legal and safety risk, taken at your own risk."
            selected={gray}
            onPress={() => setGray((v) => !v)}
          />

          <Next label="Finish" onPress={finish} />
        </>
      )}
    </Screen>
  );
}

function Choice({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={[s.choice, selected && s.choiceOn]}>
        <Body>{label}</Body>
        <Small muted>{hint}</Small>
      </View>
    </Pressable>
  );
}

function Next({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress}>
      <View style={[s.next, disabled && s.nextOff]}>
        <Text style={s.nextText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  choiceOn: { borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  chipText: { ...type.small, color: colors.textMuted },
  chipTextOn: { color: colors.accent },
  next: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
    marginTop: space.md,
  },
  nextOff: { opacity: 0.4 },
  nextText: { ...type.subheading, color: colors.accentText },
});
