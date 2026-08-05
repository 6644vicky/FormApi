"use client";

import { Flex, Progress } from "@chakra-ui/react";

interface FullPageLoaderProps {
  /** Colour of the moving bar. Defaults to customGray.700. */
  barColor?: string;
  /** Colour of the track behind the bar. Defaults to customGray.100. */
  trackColor?: string;
  /** Page background behind the loader. Defaults to white. */
  bg?: string;
  /** Width of the progress bar. */
  width?: string;
}

export default function FullPageLoader({
  barColor = "#3F3F46",
  trackColor = "customGray.100",
  bg = "white",
  width = "200px",
}: FullPageLoaderProps) {
  return (
    <Flex
      h="100dvh"
      w="100vw"
      align="center"
      justify="center"
      position="fixed"
      top={0}
      left={0}
      zIndex={9999}
      bg={bg}
    >
      <Progress
        isIndeterminate
        size="xs"
        width={width}
        bg={trackColor}
        borderRadius="full"
        sx={{
          "& > div": {
            backgroundColor: barColor,
            backgroundImage: "none",
          },
        }}
      />
    </Flex>
  );
}
