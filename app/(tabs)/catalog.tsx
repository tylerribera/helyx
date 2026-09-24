import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { PageMeta } from '@/components/seo';
import { Badge, Body, Card, Empty, Heading, Row, Screen, Small, Title } from '@/components/ui';
import { isDraft, searchCompounds } from '@/data/catalog';
import { colors, radius, space, riskColor, type } from '@/theme';

/**
 * The full catalog. Search covers aliases and misspellings, so a user finds a
 * compound no matter what they type.
 *
 * Renders a plain list. At 200+ entries this should become a FlatList with
 * virtualisation -- noted rather than done, because the list is currently two
 * items and premature virtualisation would obscure the structure.
 */
export default function Catalog() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCompounds(query), [query]);

  return (
    <Screen>
      <PageMeta
        title="Compound catalog"
        description="Every nootropic compound in Helyx, with dosages, side effects, legal status, interactions, and the research behind each one."
        path="/catalog"
      />
      <Title>Catalog</Title>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search compounds, aliases, or misspellings"
        placeholderTextColor={colors.textMuted}
        style={s.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Small muted>
        {results.length} compound{results.length === 1 ? '' : 's'}
      </Small>

      {results.length === 0 ? (
        <Empty message={`Nothing matches "${query}".`} />
      ) : (
        <View style={s.list}>
          {results.map((compound) => (
            <Link key={compound.slug} href={`/compound/${compound.slug}`} asChild>
              <Pressable>
                <Card>
                  <Row>
                    <Heading>{compound.name}</Heading>
                    {isDraft(compound) && <Badge label="DRAFT" color={colors.draft} />}
                  </Row>
                  <Body muted>{compound.definitions.simple}</Body>
                  <Row>
                    <Badge label={compound.risk.category} color={riskColor(compound.risk.category)} />
                    {compound.categories.map((c) => (
                      <Badge key={c} label={c} />
                    ))}
                  </Row>
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    color: colors.text,
    ...type.body,
  },
  list: { gap: space.md },
});
