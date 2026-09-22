import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Body, Card, Empty, Heading, Row, Screen, Section, Small, Title } from '@/components/ui';
import { dailyCompound, isDraft } from '@/data/catalog';
import { suggestFor } from '@/data/suggest';
import { useProfile } from '@/state/profile';
import { colors, radius, space, riskColor, type } from '@/theme';

/**
 * Home. Two jobs: the daily nootropic (the habit hook -- one new thing every
 * day, no effort required from the user), and personalised suggestions drawn
 * from onboarding.
 */
export default function Today() {
  const { profile, ready } = useProfile();
  const daily = dailyCompound();
  const suggestions = profile ? suggestFor(profile) : [];

  if (!ready) return <Screen><Empty message="Loading..." /></Screen>;

  return (
    <Screen>
      <Title>Today</Title>

      <Section title="Daily nootropic">
        {daily ? (
          <Link href={`/compound/${daily.slug}`} asChild>
            <Pressable>
              <Card>
                <Row>
                  <Heading>{daily.name}</Heading>
                  {isDraft(daily) && <Badge label="DRAFT" color={colors.draft} />}
                </Row>
                <Body muted>{daily.definitions.simple}</Body>
                <Row>
                  <Badge label={daily.risk.category} color={riskColor(daily.risk.category)} />
                  {daily.categories.slice(0, 3).map((c) => (
                    <Badge key={c} label={c} />
                  ))}
                </Row>
              </Card>
            </Pressable>
          </Link>
        ) : (
          <Empty message="No compounds in the catalog yet." />
        )}
      </Section>

      {profile ? (
        <Section title="Suggested for you">
          {suggestions.length === 0 ? (
            <Empty message="Nothing matches your goals yet. More compounds are being added." />
          ) : (
            suggestions.map(({ compound, because }) => (
              <Link key={compound.slug} href={`/compound/${compound.slug}`} asChild>
                <Pressable>
                  <Card>
                    <Row>
                      <Heading>{compound.name}</Heading>
                      {isDraft(compound) && <Badge label="DRAFT" color={colors.draft} />}
                    </Row>
                    {/* Always say why. A suggestion the user cannot interrogate is a black box. */}
                    <Small muted>{because.join(' · ')}</Small>
                  </Card>
                </Pressable>
              </Link>
            ))
          )}
        </Section>
      ) : (
        <Link href="/onboarding" asChild>
          <Pressable>
            <View style={s.cta}>
              <Text style={s.ctaTitle}>Personalise Helyx</Text>
              <Text style={s.ctaBody}>
                Answer a few questions and the app will suggest compounds that fit your goals — and
                hide the ones that do not.
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  ctaTitle: { ...type.heading, color: colors.accentText },
  ctaBody: { ...type.small, color: colors.accentText, lineHeight: 19 },
});
