import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PageMeta } from '@/components/seo';
import { Body, Card, Screen, Section, Small, Title } from '@/components/ui';
import { useProfile } from '@/state/profile';
import { colors, radius, space, type } from '@/theme';

/**
 * The assistant.
 *
 * STUB. Deliberately not wired to a model yet -- see the note rendered on
 * screen and docs/AI-COSTS.md for why, and supabase/functions/ask/ for the
 * server function that will back it.
 *
 * The one architectural decision already made here and worth preserving: the
 * app never talks to an AI provider directly. An API key shipped in a React
 * Native bundle is extractable by anyone who downloads the app, and a leaked
 * key is billed to you until you notice. Every request goes through the Edge
 * Function, which holds the key, checks the user's remaining credits, and
 * attaches their onboarding profile as context.
 */
export default function Ask() {
  const { profile } = useProfile();
  const [question, setQuestion] = useState('');

  return (
    <Screen>
      <PageMeta
        title="Ask"
        description="Ask questions about nootropic compounds and get answers tailored to your goals, experience level, and safety constraints."
        path="/ask"
      />
      <Title>Ask</Title>

      <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.riskModerate }}>
        <Small muted>
          Not connected yet. The UI and the request path exist; the model call is stubbed until
          billing and credit limits are decided. See docs/AI-COSTS.md.
        </Small>
      </Card>

      <Section title="Question">
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. what should I take with caffeine to avoid the crash?"
          placeholderTextColor={colors.textMuted}
          style={s.input}
          multiline
        />
        <Pressable onPress={() => undefined}>
          <View style={s.send}>
            <Text style={s.sendText}>Ask</Text>
          </View>
        </Pressable>
      </Section>

      <Section title="What it will know about you">
        {profile ? (
          <Card>
            <Body>Experience: {profile.experience}</Body>
            <Body>Goals: {profile.goals.join(', ')}</Body>
            <Body>Competes in sport: {profile.competesInSport ? 'yes' : 'no'}</Body>
            <Body>Gray-market compounds: {profile.willingToConsiderGrayMarket ? 'shown' : 'hidden'}</Body>
            <Small muted>
              This profile is sent with each question so answers are tailored. The same exclusions
              that filter your suggestions apply here.
            </Small>
          </Card>
        ) : (
          <Small muted>Complete onboarding and answers here get tailored to you.</Small>
        )}
      </Section>
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
    minHeight: 100,
    textAlignVertical: 'top',
    ...type.body,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  sendText: { ...type.subheading, color: colors.accentText },
});
