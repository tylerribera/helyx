import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Body,
  Card,
  DraftBanner,
  Empty,
  Heading,
  Row,
  Screen,
  Section,
  Small,
  Title,
} from '@/components/ui';
import { getCompound, interactionsFor, isDraft, publishedSlugs } from '@/data/catalog';
import { env } from '@/lib/env';
import { colors, radius, riskColor, space, type } from '@/theme';

/**
 * A compound page. This is the SEO surface of the entire product -- 200+ of
 * these are the reason the website exists alongside the app.
 *
 * `generateStaticParams` runs at build time in Node and tells Expo Router which
 * pages to pre-render as real HTML files. Only published compounds are listed,
 * so a draft is never written to the static site at all.
 */
export async function generateStaticParams(): Promise<Record<string, string>[]> {
  return publishedSlugs().map((slug) => ({ slug }));
}

export default function CompoundPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const compound = getCompound(String(slug));

  if (!compound) {
    return (
      <Screen>
        <Empty message="No such compound." />
      </Screen>
    );
  }

  const interactions = interactionsFor(compound.slug);
  const canonical = `${env.siteUrl}/compound/${compound.slug}`;

  /**
   * The machine-readable half of the page. Search engines read this; the user
   * reads the prose below. Both describe the same facts -- that duplication is
   * the separation rule, not an accident.
   */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: compound.name,
    alternateName: compound.aliases.filter((a) => a.kind !== 'misspelling').map((a) => a.name),
    description: compound.definitions.simple,
    url: canonical,
    drugClass: compound.drugClass.value,
    citation: compound.sources.map((s) => ({
      '@type': 'ScholarlyArticle',
      name: s.title,
      url: s.url,
      datePublished: String(s.year),
      publisher: { '@type': 'Organization', name: s.publisher },
    })),
  };

  return (
    <>
      <Head>
        <title>{`${compound.name} — dosage, effects, and research | Helyx`}</title>
        <meta name="description" content={compound.definitions.simple.slice(0, 155)} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${compound.name} | Helyx`} />
        <meta property="og:description" content={compound.definitions.simple.slice(0, 155)} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        {/* Drafts must never be indexed, even if one somehow reaches the web. */}
        {isDraft(compound) && <meta name="robots" content="noindex,nofollow" />}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Head>

      <Screen>
        {isDraft(compound) && <DraftBanner status={compound.meta.status} />}

        <Title>{compound.name}</Title>

        <Row>
          <Badge label={`risk: ${compound.risk.category}`} color={riskColor(compound.risk.category)} />
          <Badge label={compound.researchStatus.replace(/-/g, ' ')} />
          {compound.categories.map((c) => (
            <Badge key={c} label={c} />
          ))}
        </Row>

        {compound.aliases.length > 0 && (
          <Small muted>
            Also known as{' '}
            {compound.aliases
              .filter((a) => a.kind !== 'misspelling')
              .map((a) => a.name)
              .join(', ')}
          </Small>
        )}

        <Section title="What it is">
          <Body>{compound.definitions.simple}</Body>
        </Section>

        <Section title="The science">
          <Body muted>{compound.definitions.scientific}</Body>
        </Section>

        {compound.claims.length > 0 && (
          <Section title="What it may do">
            {compound.claims.map((claim) => (
              <Card key={claim.id}>
                <Body>{claim.statement}</Body>
                <Row>
                  <Badge label={claim.goal.replace(/-/g, ' ')} />
                  <Badge label={claim.strength.replace(/-/g, ' ')} />
                  {claim.anecdotal && <Badge label="anecdotal" color={colors.riskModerate} />}
                </Row>
                {/* A claim always shows its citation count. No uncited claim can reach here. */}
                <Small muted>
                  {claim.sources.length} source{claim.sources.length === 1 ? '' : 's'}
                </Small>
              </Card>
            ))}
          </Section>
        )}

        {compound.dosing.length > 0 && (
          <Section title="Common dosages">
            {compound.dosing.map((dose, i) => (
              <Card key={i}>
                <Heading>
                  {dose.low === dose.high ? dose.low : `${dose.low}–${dose.high}`} {dose.unit}
                </Heading>
                <Small muted>
                  {dose.route} · {dose.frequency.replace(/-/g, ' ')}
                </Small>
                {dose.note && <Small>{dose.note}</Small>}
              </Card>
            ))}
            <Small muted>
              Ranges reported in the cited research. Not a recommendation, and not medical advice.
            </Small>
          </Section>
        )}

        {(compound.halfLife || compound.kinetics) && (
          <Section title="Timing">
            <Card>
              {compound.halfLife && (
                <Small>
                  Half-life:{' '}
                  {compound.halfLife.lowHours === compound.halfLife.highHours
                    ? `~${compound.halfLife.lowHours}h`
                    : `${compound.halfLife.lowHours}–${compound.halfLife.highHours}h`}
                </Small>
              )}
              {compound.kinetics && (
                <>
                  <Small>
                    Onset: {compound.kinetics.onsetMinutesLow}–{compound.kinetics.onsetMinutesHigh} min
                  </Small>
                  <Small>
                    Duration: {compound.kinetics.durationHoursLow}–{compound.kinetics.durationHoursHigh} h
                  </Small>
                </>
              )}
            </Card>
          </Section>
        )}

        <Section title="Risk">
          <Card style={{ borderLeftWidth: 3, borderLeftColor: riskColor(compound.risk.category) }}>
            <Heading>{compound.risk.category}</Heading>
            <Body muted>{compound.risk.why}</Body>
          </Card>
        </Section>

        {compound.sideEffects.length > 0 && (
          <Section title="Side effects">
            {compound.sideEffects.map((effect, i) => (
              <Card key={i}>
                <Body>{effect.effect}</Body>
                <Row>
                  <Badge label={effect.frequency} />
                  <Badge label={effect.severity} />
                </Row>
                {effect.mitigation && <Small muted>Mitigation: {effect.mitigation}</Small>}
              </Card>
            ))}
          </Section>
        )}

        {interactions.length > 0 && (
          <Section title="Pairs with">
            {interactions.map(({ other, interaction }) => (
              <Card key={other}>
                <Row>
                  <Heading>{other}</Heading>
                  <Badge label={interaction.risk} />
                  {/* Inferred pairs are always labelled as inferred. */}
                  {interaction.provenance === 'pathway-overlap' && <Badge label="inferred" />}
                </Row>
                <Small muted>{interaction.note}</Small>
              </Card>
            ))}
          </Section>
        )}

        {compound.doNotPairWith.length > 0 && (
          <Section title="Do not pair with">
            <Row>
              {compound.doNotPairWith.map((s2) => (
                <Badge key={s2} label={s2} color={colors.riskHigh} />
              ))}
            </Row>
          </Section>
        )}

        {compound.legal.length > 0 && (
          <Section title="Legal status">
            {compound.legal.map((entry) => (
              <Card key={entry.jurisdiction}>
                <Row>
                  <Heading>{entry.jurisdiction}</Heading>
                  <Badge label={entry.status.replace(/-/g, ' ')} />
                </Row>
                <Small muted>{entry.display}</Small>
                <Small muted>As of {entry.asOf}</Small>
              </Card>
            ))}
          </Section>
        )}

        {compound.sport.length > 0 && (
          <Section title="Sport eligibility">
            {compound.sport.map((entry) => (
              <Row key={entry.body}>
                <Badge
                  label={`${entry.body}: ${entry.status.replace(/-/g, ' ')}`}
                  color={entry.status === 'permitted' ? colors.riskLow : colors.riskHigh}
                />
              </Row>
            ))}
          </Section>
        )}

        {compound.buying.length > 0 && (
          <Section title="What to look for when buying">
            {compound.buying.map((guide, i) => (
              <Card key={i}>
                <Heading>{guide.form}</Heading>
                <Small muted>{guide.whyItMatters}</Small>
              </Card>
            ))}
            <Small muted>No affiliate links. Helyx does not sell or recommend brands.</Small>
          </Section>
        )}

        {compound.notes && (
          <Section title="Notes">
            <Body muted>{compound.notes}</Body>
          </Section>
        )}

        {/* Sources last, as specified: every page ends with what it stands on. */}
        <Section title={`Sources (${compound.sources.length})`}>
          {compound.sources.map((source) => (
            <Pressable key={source.id} onPress={() => Linking.openURL(source.url)}>
              <Card>
                <Body>{source.title}</Body>
                <Small muted>
                  {source.publisher} · {source.year} · {source.evidence.replace(/-/g, ' ')}
                  {source.sampleSize ? ` · n=${source.sampleSize}` : ''}
                </Small>
                <Small muted>{source.takeaway}</Small>
              </Card>
            </Pressable>
          ))}
        </Section>

        <View style={s.meta}>
          <Small muted>
            Last updated {compound.meta.lastUpdatedAt}
            {compound.meta.lastReviewedAt ? ` · last reviewed ${compound.meta.lastReviewedAt}` : ''}
          </Small>
          <Text style={s.disclaimer}>
            Educational information only. Helyx is not medical advice. Talk to a clinician before
            taking anything, especially alongside prescription medication.
          </Text>
        </View>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  meta: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.lg,
    gap: space.sm,
  },
  disclaimer: { ...type.tiny, color: colors.textMuted, lineHeight: 16 },
});
