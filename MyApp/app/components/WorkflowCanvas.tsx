"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
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
import { AddIcon, ChevronDownIcon, DeleteIcon, InfoOutlineIcon, WarningTwoIcon } from "@chakra-ui/icons";

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
      // Marks the card so a drag starting inside it pans nothing — the canvas
      // only pans from empty space.
      data-workflow-node
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
  // Free canvas: the content sits on a layer that pans and scales, rather
  // than in a scroll container.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFlowOutOfView, setIsFlowOutOfView] = useState(false);
  // Recentring eases over a longer curve than an ordinary zoom step, so
  // returning from far off-canvas reads as travel rather than a jump cut.
  const [isRecentring, setIsRecentring] = useState(false);
  const recentreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginPan = (event: React.PointerEvent) => {
    // Ignore drags that start on a node, so its inputs and menus still work.
    if ((event.target as HTMLElement).closest("[data-workflow-node]")) return;
    panStart.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isPanning) return;
    const onPointerMove = (event: PointerEvent) => {
      setPan({
        x: panStart.current.panX + (event.clientX - panStart.current.pointerX),
        y: panStart.current.panY + (event.clientY - panStart.current.pointerY),
      });
    };
    const onPointerUp = () => setIsPanning(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isPanning]);

  // Wheel pans the canvas; with a modifier held it zooms, the way a design
  // tool behaves. Registered natively rather than via React's onWheel, which
  // is passive — preventDefault there is ignored, and a horizontal trackpad
  // swipe would be taken as the browser's back gesture.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        setZoom((value) => Math.round(Math.min(150, Math.max(50, value - event.deltaY * 0.3))));
        return;
      }
      setPan((previous) => ({ x: previous.x - event.deltaX, y: previous.y - event.deltaY }));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // A sliver still technically intersects, so require this much of the flow to
  // be on screen before it counts as visible.
  const VISIBLE_MARGIN = 48;

  useEffect(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;
    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const overlapX = Math.min(canvasRect.right, contentRect.right) - Math.max(canvasRect.left, contentRect.left);
      const overlapY = Math.min(canvasRect.bottom, contentRect.bottom) - Math.max(canvasRect.top, contentRect.top);
      setIsFlowOutOfView(overlapX < VISIBLE_MARGIN || overlapY < VISIBLE_MARGIN);
    };
    // After the transform settles, so a zoom step isn't measured mid-animation.
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [pan, zoom, isRecentring, workflow.actions.length]);

  const RECENTRE_MS = 500;
  const RECENTRE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

  const resetView = () => {
    setIsRecentring(true);
    setPan({ x: 0, y: 0 });
    setZoom(100);
    if (recentreTimer.current) clearTimeout(recentreTimer.current);
    recentreTimer.current = setTimeout(() => setIsRecentring(false), RECENTRE_MS);
  };

  useEffect(() => () => {
    if (recentreTimer.current) clearTimeout(recentreTimer.current);
  }, []);

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
      overflow="hidden"
      bg="customGray.50"
      ref={canvasRef}
      cursor={isPanning ? "grabbing" : "grab"}
      onPointerDown={beginPan}
      sx={{
        // Stops a horizontal trackpad swipe from being handed to the browser
        // as back/forward navigation once the canvas has nothing left to give.
        overscrollBehavior: "none",
        backgroundImage: "radial-gradient(circle, var(--chakra-colors-customGray-300) 1px, transparent 1px)",
        backgroundSize: `${22 * (zoom / 100)}px ${22 * (zoom / 100)}px`,
        // Anchoring the grid to the pan makes the surface itself feel like it
        // is moving, rather than the nodes sliding over a fixed backdrop.
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        transition: isRecentring
          ? `background-position ${RECENTRE_MS}ms ${RECENTRE_EASING}, background-size ${RECENTRE_MS}ms ${RECENTRE_EASING}`
          : "none",
        touchAction: "none",
      }}
    >
      <VStack
        ref={contentRef}
        spacing="0px"
        align="center"
        position="absolute"
        top="0"
        left="50%"
        py="40px"
        transform={`translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${zoom / 100})`}
        transformOrigin="top center"
        transition={
          isPanning ? "none"
          : isRecentring ? `transform ${RECENTRE_MS}ms ${RECENTRE_EASING}`
          : "transform 0.15s"
        }
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
          data-workflow-node
          position="absolute"
          bottom="32px"
          left="50%"
          opacity={isFlowOutOfView ? 1 : 0}
          transform={isFlowOutOfView ? "translate(-50%, 0)" : "translate(-50%, 8px)"}
          pointerEvents={isFlowOutOfView ? "auto" : "none"}
          transition="opacity 0.3s ease, transform 0.3s ease"
          cursor="default"
          spacing="12px"
          bg="white"
          border="1px solid"
          borderColor="customGray.200"
          borderRadius="12px"
          boxShadow="0 4px 16px rgba(0,0,0,0.10)"
          pl="14px"
          pr="8px"
          py="8px"
          zIndex={3}
        >
          <HStack spacing="8px">
            <InfoOutlineIcon w="14px" h="14px" color="brand.primary" />
            <Text fontSize="14px" color="customGray.800">
              <Text as="span" fontWeight="600">Your workflow</Text> is out of view.
            </Text>
          </HStack>
          <Button
            size="sm"
            fontSize="14px"
            fontWeight="500"
            borderRadius="8px"
            bg="brand.primary"
            color="white"
            _hover={{ bg: "brand.primaryHover" }}
            _active={{ bg: "brand.primaryHover" }}
            onClick={resetView}
          >
            Show
          </Button>
      </HStack>

      <HStack
        data-workflow-node
        position="absolute"
        bottom="16px"
        right="16px"
        cursor="default"
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
        <Text
          as="button"
          fontSize="14px"
          color="customGray.700"
          minW="46px"
          textAlign="center"
          title="Reset view"
          _hover={{ color: "customGray.900" }}
          onClick={resetView}
        >
          {zoom}%
        </Text>
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
