import { Link, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { Body, Card, Screen, Title } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <Title>Not found</Title>
        <Link href="/" asChild>
          <Pressable>
            <Card>
              <Body>Back to Today</Body>
            </Card>
          </Pressable>
        </Link>
      </Screen>
    </>
  );
}
