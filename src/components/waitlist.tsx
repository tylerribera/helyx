import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, type } from '@/theme';

/**
 * Email capture.
 *
 * Writes to the `waitlist` table, whose RLS policy allows insert and nothing
 * else — anyone may join, nobody can read the list back from the client. That
 * matters because the anon key ships in the bundle: the policy, not the key, is
 * what keeps the list private.
 */

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done' }
  | { kind: 'already' }
  | { kind: 'error'; message: string };

/** Deliberately permissive. Rejecting valid-but-unusual addresses loses signups. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const configured = supabase !== null;
  const busy = state.kind === 'sending';

  async function submit() {
    const value = email.trim().toLowerCase();

    if (!looksLikeEmail(value)) {
      setState({ kind: 'error', message: 'That does not look like an email address.' });
      return;
    }
    if (!supabase) {
      setState({ kind: 'error', message: 'Signups are not connected yet. Try again shortly.' });
      return;
    }

    setState({ kind: 'sending' });
    const { error } = await supabase.from('waitlist').insert({ email: value, source: 'web' });

    if (!error) {
      setState({ kind: 'done' });
      setEmail('');
      return;
    }

    // 23505 is the unique-violation code. Being on the list twice is not a
    // failure, and showing a database error for it would read as one.
    if (error.code === '23505') {
      setState({ kind: 'already' });
      setEmail('');
      return;
    }

    setState({ kind: 'error', message: 'Something went wrong. Try again in a moment.' });
  }

  if (state.kind === 'done' || state.kind === 'already') {
    return (
      <View style={s.result}>
        <Text style={s.resultTitle}>
          {state.kind === 'done' ? "You're on the list." : "You're already on the list."}
        </Text>
        <Text style={s.resultBody}>
          We'll email you when the app is ready. No newsletter, no forwarding your address on.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <TextInput
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (state.kind === 'error') setState({ kind: 'idle' });
          }}
          onSubmitEditing={submit}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={s.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          editable={!busy}
          returnKeyType="go"
        />
        <Pressable onPress={busy ? undefined : submit} style={[s.button, busy && s.buttonBusy]}>
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={s.buttonText}>Join</Text>
          )}
        </Pressable>
      </View>

      {state.kind === 'error' && <Text style={s.error}>{state.message}</Text>}

      {!configured && (
        <Text style={s.notice}>
          Not connected to a backend yet — set the Supabase environment variables to enable
          signups.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.sm, width: '100%' },
  row: { flexDirection: 'row', gap: space.sm, width: '100%' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: colors.text,
    ...type.body,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 88,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { ...type.subheading, color: colors.accentText },
  error: { ...type.small, color: colors.riskHigh },
  notice: { ...type.tiny, color: colors.textMuted },
  result: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
    width: '100%',
  },
  resultTitle: { ...type.subheading, color: colors.accent },
  resultBody: { ...type.small, color: colors.textMuted, lineHeight: 19 },
});
