"use client";

import { Box, Heading, Text, Button } from "@chakra-ui/react";

export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      flexDirection="column"
      gap={4}
      bg="white"
    >
      <Heading>Builder Error</Heading>
      <Text>{error.message}</Text>
      <Button onClick={() => reset()}>Try again</Button>
    </Box>
  );
}
