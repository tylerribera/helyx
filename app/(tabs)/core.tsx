import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PageMeta } from '@/components/seo';
import { Body, Card, Screen, Section, Small, Title } from '@/components/ui';
import { useProfile } from '@/state/profile';
import { colors, radius, space, type } from '@/theme';

/**
 * Membership surface. Shows what Core adds, and is where the paywall will live.
 *
 * Nothing here charges money yet -- billing is deliberately not built, because
 * the choice of processor (RevenueCat, Stripe, native IAP) has consequences
 * for both app-store compliance and the data model, and is better made by the
 * developer who will own it.
 */
export default function Core() {
  const { profile, tier, reset } = useProfile();

  return (
    <Screen>
      <PageMeta
        title="Helyx Core"
        description="A personalised protocol built around your goals, plus nutrition, sleep, and technique guidance that changes how well anything else works."
        path="/core"
      />
      <Title>Helyx Core</Title>

      <Card>
        <Body>Current plan: {tier === 'core' ? 'Core' : 'Free'}</Body>
        <Small muted>Billing is not implemented. Everyone is on the free tier.</Small>
      </Card>

      <Section title="What Core adds">
        <Card>
          <Body>A deeper second onboarding</Body>
          <Small muted>
            More specific questions, producing a personalised protocol rather than individual
            suggestions.
          </Small>
        </Card>
        <Card>
          <Body>Protocol, not just compounds</Body>
          <Small muted>
            Nutrition, sleep, and behavioural techniques paired with compounds — the things that
            change how well anything else works.
          </Small>
        </Card>
        <Card>
          <Body>A better-trained assistant</Body>
          <Small muted>The Core profile gives the assistant much more to work with.</Small>
        </Card>
        <Card>
          <Body>Members-only community</Body>
          <Small muted>
            Moderated feed of research breakdowns and stack write-ups. Waitlist first — the
            community only works if there is something in it on day one.
          </Small>
        </Card>
      </Section>

      <Section title="Your profile">
        {profile ? (
          <>
            <Card>
              <Body>Experience: {profile.experience}</Body>
              <Body>Goals: {profile.goals.join(', ')}</Body>
            </Card>
            <Pressable onPress={reset}>
              <View style={s.secondary}>
                <Text style={s.secondaryText}>Redo onboarding</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <Link href="/onboarding" asChild>
            <Pressable>
              <View style={s.secondary}>
                <Text style={s.secondaryText}>Complete onboarding</Text>
              </View>
            </Pressable>
          </Link>
        )}
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  secondaryText: { ...type.subheading, color: colors.text },
});
