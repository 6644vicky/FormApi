"use client";

import { useState } from "react";
import {
  Box,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon, DeleteIcon, WarningTwoIcon } from "@chakra-ui/icons";

export type WorkflowAction = {
  id: string;
  type: string;
  subject: string;
  body: string;
};

export type WorkflowState = {
  trigger: string;
  // Whether this workflow runs for the event's booking link. Drives the
  // "Not active on any booking link" warning on the trigger node.
  isActive: boolean;
  actions: WorkflowAction[];
};

export const TRIGGER_OPTIONS = [
  "When event is booked",
  "24 hours before event",
  "1 hour before event",
  "When event is cancelled",
  "After event ends",
];

export const ACTION_OPTIONS = ["Send email to attendees", "Send email to host", "Send email to a specific address"];

export const DEFAULT_WORKFLOW: WorkflowState = {
  trigger: "24 hours before event",
  isActive: false,
  actions: [
    {
      id: "reminder-email",
      type: "Send email to attendees",
      subject: "Reminder: {EVENT_NAME} - {EVENT_DATE_ddd, MMM D}",
      body: "Hi {ATTENDEE},\nThis is a reminder about your upcoming event.\nEvent: {EVENT_NAME}\nWhen: {EVENT_TIME}",
    },
  ],
};

function LightningIcon() {
  return (
    <Icon viewBox="0 0 16 16" w="16px" h="16px" fill="none">
      <path d="M9 1.5 3.5 9h4l-.5 5.5L13 7H9l.5-5.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </Icon>
  );
}

function MailIcon() {
  return (
    <Icon viewBox="0 0 16 16" w="16px" h="16px" fill="none">
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="m2.5 5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

// The vertical line and "+" that joins two nodes — clicking it appends a step.
function Connector({ onAdd }: { onAdd: () => void }) {
  return (
    <VStack spacing="0px" align="center">
      <Box w="1px" h="16px" bg="customGray.300" />
      <IconButton
        aria-label="Add a step"
        icon={<AddIcon w="10px" h="10px" />}
        size="xs"
        isRound
        bg="white"
        border="1px solid"
        borderColor="customGray.300"
        color="customGray.600"
        _hover={{ bg: "customGray.50", borderColor: "customGray.400" }}
        onClick={onAdd}
      />
      <Box w="1px" h="16px" bg="customGray.300" />
    </VStack>
  );
}

function NodeCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      w="500px"
      bg="white"
      border="1px solid"
      borderColor="customGray.200"
      borderRadius="12px"
      boxShadow="0 1px 3px rgba(0,0,0,0.06)"
      overflow="hidden"
    >
      {children}
    </Box>
  );
}

function NodeHeader({
  icon,
  iconBg,
  iconColor,
  value,
  options,
  onChange,
  onDelete,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onDelete?: () => void;
}) {
  return (
    <HStack justify="space-between" align="center" px="16px" py="14px" bg="customGray.50">
      <HStack spacing="12px" minW="0">
        <Box w="32px" h="32px" borderRadius="8px" bg={iconBg} color={iconColor} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
          {icon}
        </Box>
        <Menu placement="bottom-start" autoSelect={false}>
          <MenuButton
            as={Box}
            role="button"
            display="inline-flex"
            alignItems="center"
            gap="6px"
            cursor="pointer"
            fontSize="15px"
            fontWeight="500"
            color="customGray.800"
            _hover={{ color: "customGray.900" }}
          >
            {value}
            <ChevronDownIcon w="16px" h="16px" color="customGray.500" />
          </MenuButton>
          <MenuList minW="260px" fontSize="14px" zIndex={20}>
            {options.map((option) => (
              <MenuItem key={option} onClick={() => onChange(option)}>{option}</MenuItem>
            ))}
          </MenuList>
        </Menu>
      </HStack>
      {onDelete && (
        <IconButton
          aria-label="Delete this step"
          icon={<DeleteIcon w="14px" h="14px" />}
          size="sm"
          variant="ghost"
          color="customGray.500"
          _hover={{ bg: "transparent", color: "red.500" }}
          onClick={onDelete}
        />
      )}
    </HStack>
  );
}

export function WorkflowCanvas({
  workflow,
  onChange,
}: {
  workflow: WorkflowState;
  onChange: (workflow: WorkflowState) => void;
}) {
  const [zoom, setZoom] = useState(100);

  const addAction = (index: number) => {
    const next = [...workflow.actions];
    next.splice(index, 0, {
      id: `action-${Date.now()}`,
      type: "Send email to attendees",
      subject: "",
      body: "",
    });
    onChange({ ...workflow, actions: next });
  };

  const updateAction = (id: string, patch: Partial<WorkflowAction>) =>
    onChange({
      ...workflow,
      actions: workflow.actions.map((action) => (action.id === id ? { ...action, ...patch } : action)),
    });

  const removeAction = (id: string) =>
    onChange({ ...workflow, actions: workflow.actions.filter((action) => action.id !== id) });

  const fieldStyles = {
    border: "none",
    borderRadius: "6px",
    px: "6px",
    py: "2px",
    fontSize: "14px",
    color: "customGray.600",
    bg: "transparent",
    _hover: { bg: "customGray.50" },
    _focusVisible: { bg: "white", boxShadow: "0 0 0 2px var(--chakra-colors-customDark-10)" },
  };

  return (
    <Box
      flex="1"
      position="relative"
      overflow="auto"
      bg="customGray.50"
      sx={{
        backgroundImage: "radial-gradient(circle, var(--chakra-colors-customGray-300) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <VStack
        spacing="0px"
        align="center"
        py="40px"
        transform={`scale(${zoom / 100})`}
        transformOrigin="top center"
        transition="transform 0.15s"
      >
        {/* Trigger — every workflow starts with exactly one, so it has no delete. */}
        <NodeCard>
          <NodeHeader
            icon={<LightningIcon />}
            iconBg="orange.100"
            iconColor="orange.500"
            value={workflow.trigger}
            options={TRIGGER_OPTIONS}
            onChange={(trigger) => onChange({ ...workflow, trigger })}
          />
          {!workflow.isActive && (
            <HStack
              as="button"
              w="100%"
              spacing="8px"
              px="16px"
              py="12px"
              color="orange.500"
              _hover={{ bg: "orange.50" }}
              onClick={() => onChange({ ...workflow, isActive: true })}
            >
              <WarningTwoIcon w="14px" h="14px" />
              <Text fontSize="14px">Not active on any booking link</Text>
            </HStack>
          )}
        </NodeCard>

        {workflow.actions.map((action, index) => (
          <VStack key={action.id} spacing="0px" align="center">
            <Connector onAdd={() => addAction(index)} />
            <NodeCard>
              <NodeHeader
                icon={<MailIcon />}
                iconBg="blue.50"
                iconColor="blue.500"
                value={action.type}
                options={ACTION_OPTIONS}
                onChange={(type) => updateAction(action.id, { type })}
                onDelete={() => removeAction(action.id)}
              />
              <VStack align="stretch" spacing="10px" px="16px" py="14px">
                <VStack align="stretch" spacing="2px">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">Subject</Text>
                  <Input
                    {...fieldStyles}
                    value={action.subject}
                    placeholder="Reminder: {EVENT_NAME}"
                    onChange={(event) => updateAction(action.id, { subject: event.target.value })}
                  />
                </VStack>
                <VStack align="stretch" spacing="2px">
                  <Text fontSize="14px" fontWeight="600" color="customGray.800">Email body</Text>
                  <Textarea
                    {...fieldStyles}
                    rows={4}
                    value={action.body}
                    placeholder="Hi {ATTENDEE}, …"
                    onChange={(event) => updateAction(action.id, { body: event.target.value })}
                  />
                </VStack>
              </VStack>
            </NodeCard>
          </VStack>
        ))}

        <Connector onAdd={() => addAction(workflow.actions.length)} />
      </VStack>

      <HStack
        position="absolute"
        bottom="16px"
        right="16px"
        spacing="2px"
        bg="white"
        border="1px solid"
        borderColor="customGray.200"
        borderRadius="10px"
        px="4px"
        py="4px"
        boxShadow="0 1px 3px rgba(0,0,0,0.08)"
      >
        <IconButton
          aria-label="Zoom out"
          icon={<Text fontSize="16px" lineHeight="1">−</Text>}
          size="sm"
          variant="ghost"
          color="customGray.600"
          isDisabled={zoom <= 50}
          onClick={() => setZoom((value) => Math.max(50, value - 10))}
        />
        <Text fontSize="14px" color="customGray.700" minW="46px" textAlign="center">{zoom}%</Text>
        <IconButton
          aria-label="Zoom in"
          icon={<Text fontSize="16px" lineHeight="1">+</Text>}
          size="sm"
          variant="ghost"
          color="customGray.600"
          isDisabled={zoom >= 150}
          onClick={() => setZoom((value) => Math.min(150, value + 10))}
        />
      </HStack>
    </Box>
  );
}
