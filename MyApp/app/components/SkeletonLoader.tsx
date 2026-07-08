"use client";

import { Box, VStack, HStack, Skeleton, SkeletonText } from "@chakra-ui/react";

export function InboxSkeleton() {
  return (
    <VStack w="full" h="full" spacing={0} align="stretch">
      {/* Header Skeleton */}
      <HStack
        h="80px"
        px="2xl"
        borderBottom="1px solid"
        borderColor="customGray.200"
        spacing="lg"
        bg="white"
      >
        <VStack align="start" spacing="xs" flex={1}>
          <Skeleton h="24px" w="150px" borderRadius="md" />
          <Skeleton h="16px" w="100px" borderRadius="md" />
        </VStack>
        <Skeleton h="44px" w="300px" borderRadius="base" />
      </HStack>

      {/* Messages List Skeleton */}
      <VStack flex={1} spacing="0" align="stretch" overflowY="auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <HStack
            key={i}
            p="12px"
            borderBottom="1px solid"
            borderColor="customGray.200"
            spacing="12px"
            _hover={{ bg: "customGray.50" }}
          >
            <Skeleton h="40px" w="40px" borderRadius="full" flexShrink={0} />
            <VStack align="start" spacing="6px" flex={1}>
              <Skeleton h="16px" w="40%" borderRadius="md" />
              <Skeleton h="14px" w="70%" borderRadius="md" />
            </VStack>
            <Skeleton h="16px" w="60px" borderRadius="md" flexShrink={0} />
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}

export function BuilderSkeleton() {
  return (
    <VStack w="full" h="full" spacing={0} align="stretch">
      {/* Header Skeleton */}
      <HStack
        h="80px"
        px="2xl"
        borderBottom="1px solid"
        borderColor="customGray.200"
        spacing="lg"
        bg="white"
      >
        <Skeleton h="32px" w="200px" borderRadius="md" />
        <Box flex={1} />
        <Skeleton h="44px" w="120px" borderRadius="base" />
      </HStack>

      {/* Main Content Skeleton */}
      <HStack flex={1} spacing={0} align="stretch">
        {/* Left Sidebar Skeleton */}
        <VStack
          w="280px"
          h="full"
          spacing="12px"
          p="12px"
          borderRight="1px solid"
          borderColor="customGray.200"
          bg="customGray.50"
          overflowY="auto"
        >
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} w="full">
              <Skeleton h="40px" borderRadius="md" mb="8px" />
            </Box>
          ))}
        </VStack>

        {/* Main Content Skeleton */}
        <VStack flex={1} spacing="16px" p="24px" overflowY="auto">
          <Skeleton h="32px" w="50%" borderRadius="md" alignSelf="flex-start" />
          <VStack spacing="12px" w="full">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} h="60px" w="full" borderRadius="md" />
            ))}
          </VStack>
        </VStack>

        {/* Right Panel Skeleton */}
        <VStack
          w="300px"
          h="full"
          spacing="16px"
          p="16px"
          borderLeft="1px solid"
          borderColor="customGray.200"
          bg="customGray.50"
          overflowY="auto"
        >
          {[1, 2, 3].map((i) => (
            <Box key={i} w="full">
              <Skeleton h="16px" w="80%" mb="8px" borderRadius="md" />
              <Skeleton h="12px" w="60%" borderRadius="md" />
            </Box>
          ))}
        </VStack>
      </HStack>
    </VStack>
  );
}

export function MessageCardSkeleton() {
  return (
    <HStack p="12px" spacing="12px" w="full">
      <Skeleton h="40px" w="40px" borderRadius="full" flexShrink={0} />
      <VStack align="start" spacing="6px" flex={1}>
        <Skeleton h="16px" w="40%" borderRadius="md" />
        <Skeleton h="14px" w="70%" borderRadius="md" />
      </VStack>
      <Skeleton h="16px" w="60px" borderRadius="md" flexShrink={0} />
    </HStack>
  );
}

export function PageTransitionSkeleton() {
  return (
    <Box w="full" h="full" bg="white" position="relative">
      <VStack w="full" h="full" spacing={4} p={6} align="stretch">
        <Skeleton h="40px" w="60%" borderRadius="md" />
        <VStack spacing={4} w="full">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} h="100px" w="full" borderRadius="md" />
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}
