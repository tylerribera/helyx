import { Link, Redirect } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PageMeta } from '@/components/seo';
import { Waitlist } from '@/components/waitlist';
import { colors, radius, space, type } from '@/theme';

/**
 * helyx.us landing page.
 *
 * Web only. On native this route immediately hands off to the tabs — someone
 * who already installed the app does not need to be sold on it.
 *
 * The app itself stays reachable on web at /today, /catalog, /ask and /core,
 * so it can be demonstrated in a browser. Making the app the site's front door
 * is a matter of changing the redirect below, once there is a catalog worth
 * showing.
 */
export default function Landing() {
  if (Platform.OS !== 'web') return <Redirect href="/today" />;

  return (
    <>
      <PageMeta
        title="Brain health, researched"
        description="A sourced catalog of nootropic compounds — what they do, what the evidence says, and what not to take them with. Join the list for early access."
        path="/"
      />

      <ScrollView style={s.page} contentContainerStyle={s.content}>
        <View style={s.hero}>
          {/* A raw <img>, not react-native-web's Image, which applies the
              source as a background via JS — the logo would then be missing
              from the server-rendered HTML and pop in after hydration. Safe
              because the Platform guard above means this never runs on native. */}
          <img src="/helyx-logo.svg" alt="Helyx" width={200} height={40} />

          <Text style={s.headline}>Brain health, researched.</Text>

          <Text style={s.sub}>
            A catalog of nootropic compounds where every claim carries a citation — doses, side
            effects, half-life, legal status, and what not to take them with. No affiliate links,
            no hype, nothing published until a human has checked the sources.
          </Text>

          <View style={s.form}>
            <Text style={s.formLabel}>Get an email when it opens</Text>
            <Waitlist />
          </View>
        </View>

        <View style={s.points}>
          <Point
            title="Cited or it does not ship"
            body="A compound needs four qualifying sources before it can publish, and every individual claim carries its own citation. Anecdote is labelled as anecdote."
          />
          <Point
            title="Built around what you are actually after"
            body="Focus, sleep, stress, memory. Tell it once and the suggestions fit — and anything banned in tested sport stays hidden if you compete."
          />
          <Point
            title="The interactions matter more than the compounds"
            body="What pairs well, what cancels out, and what you should not combine. Every pairing is sourced, and inferred ones are labelled as inferred."
          />
        </View>

        <View style={s.footer}>
          <Link href="/catalog" asChild>
            <Pressable>
              <Text style={s.link}>Preview the catalog →</Text>
            </Pressable>
          </Link>
          <Text style={s.fine}>
            Educational information only. Helyx is not medical advice. Talk to a clinician before
            taking anything, especially alongside prescription medication.
          </Text>
          <Text style={s.fine}>© {new Date().getFullYear()} Helyx · hello@helyx.us</Text>
        </View>
      </ScrollView>
    </>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.point}>
      <Text style={s.pointTitle}>{title}</Text>
      <Text style={s.pointBody}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.xl,
    paddingTop: space.xxl * 2,
    paddingBottom: space.xxl * 2,
    gap: space.xxl * 1.5,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: space.lg, alignItems: 'flex-start' },
  headline: { ...type.title, fontSize: 40, lineHeight: 46, color: colors.text },
  sub: { ...type.body, fontSize: 17, lineHeight: 27, color: colors.textMuted },
  form: {
    width: '100%',
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  formLabel: { ...type.subheading, color: colors.text },
  points: { gap: space.xl },
  point: { gap: space.xs },
  pointTitle: { ...type.subheading, color: colors.text },
  pointBody: { ...type.small, color: colors.textMuted, lineHeight: 21 },
  footer: {
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.xl,
  },
  link: { ...type.small, color: colors.accent },
  fine: { ...type.tiny, color: colors.textMuted, lineHeight: 16 },
});
