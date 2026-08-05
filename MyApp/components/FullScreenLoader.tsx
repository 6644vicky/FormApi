import { Flex, Progress } from "@chakra-ui/react";

export default function FullScreenLoader() {
  return (
    <Flex
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      bg="white"
      justify="center"
      align="center"
      zIndex="9999"
    >
      <Progress
        isIndeterminate
        size="xs"
        width="200px"
        colorScheme="teal"
        trackColor="transparent"
        borderRadius="full"
      />
    </Flex>
  );
}
