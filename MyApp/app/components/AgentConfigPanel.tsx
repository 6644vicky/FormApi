"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, CheckIcon, ChevronDownIcon, SmallCloseIcon, TriangleDownIcon } from "@chakra-ui/icons";
import { AgentMark } from "@/app/components/AgentMark";
import { HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";

export type KnowledgeFile = { id: string; name: string; url: string };

export type AgentConfig = {
  description?: string;
  category?: string;
  skills?: string[];
  knowledge?: KnowledgeFile[];
  fields?: string[];
  fieldValues?: Record<string, string>;
  quickPrompts?: string[];
  /** Whether a tone was chosen — until then the row shows a dashed Add. */
  toneSet?: boolean;
};

export const AGENT_CATEGORIES = ["Customer success", "Sales", "Support", "Onboarding", "Internal help desk"];
export const AGENT_SKILLS = ["Answer FAQs", "Collect leads", "Book meetings", "Share documents", "Hand off to a human"];
export const AGENT_TONES = ["Professional", "Friendly", "Casual", "Formal"];
export const AGENT_RESPONSE_LENGTHS = ["Concise", "Standard", "Detailed"];

const MAX_INSTRUCTIONS_LENGTH = 4000;
// The widget only has room for so many pills above the message box.
const MAX_QUICK_PROMPTS = 5;
const MESSAGE_LINE_HEIGHT = 22.4;
// Four lines, then it opens itself up and keeps growing with the text.
const MESSAGE_COLLAPSED_MAX_HEIGHT = Math.ceil(MESSAGE_LINE_HEIGHT * 4) + 2;

// A label column and the chips beside it — the row this panel repeats.
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HStack align="center" spacing="20px" py="7px">
      <Text w="130px" flexShrink={0} fontSize="14px" color="customGray.700">{label}</Text>
      <HStack flex="1" minW="0" spacing="8px" wrap="wrap">{children}</HStack>
    </HStack>
  );
}

function Chip({
  children,
  onRemove,
  dashed = false,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  dashed?: boolean;
}) {
  return (
    <HStack
      spacing="4px"
      h="24px"
      pl="8px"
      pr={onRemove ? "4px" : "8px"}
      borderRadius="full"
      border={dashed ? "1px dashed" : "none"}
      borderColor="customGray.300"
      bg={dashed ? "white" : "customGray.100"}
      maxW="100%"
    >
      <Text fontSize="12px" fontWeight="500" color="customGray.800" isTruncated>{children}</Text>
      {onRemove && (
        <IconButton
          aria-label="Remove"
          icon={<SmallCloseIcon boxSize="12px" />}
          size="xs"
          variant="ghost"
          color="customGray.500"
          _hover={{ bg: "transparent", color: "customGray.700" }}
          onClick={onRemove}
        />
      )}
    </HStack>
  );
}

// A chip that opens a single-choice menu (category, tone, response length).
function ChoiceChip({
  value,
  placeholder,
  options,
  onChange,
}: {
  value?: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Menu isLazy placement="bottom-start">
      <MenuButton
        h="24px"
        px="8px"
        borderRadius="full"
        border={value ? "none" : "1px solid"}
        borderColor="customGray.200"
        bg={value ? "customGray.100" : "white"}
        _hover={value ? { bg: "customGray.200" } : { borderColor: "customGray.300" }}
      >
        <HStack spacing="4px" h="100%" align="center">
          <Text fontSize="12px" fontWeight="500" color={value ? "customGray.800" : "customGray.500"} whiteSpace="nowrap">
            {value || placeholder}
          </Text>
          <ChevronDownIcon boxSize="12px" color="customGray.600" />
        </HStack>
      </MenuButton>
      <MenuList minW="200px" boxShadow="0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)">
        {options.map((option) => (
          <MenuItem key={option} fontSize="14px" gap="8px" onClick={() => onChange(option)}>
            <Box flex="1">{option}</Box>
            {value === option && <CheckIcon boxSize="12px" color="customGray.700" />}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

// Dashed "Add" that opens a single-choice menu.
function AddChoiceMenu({ label = "Add", options, onSelect }: { label?: string; options: string[]; onSelect: (value: string) => void }) {
  return (
    <Menu isLazy placement="bottom-start">
      {/* MenuButton renders its own button element — laying the contents out
          with `as={HStack}` leaves them stacked, so the flex row goes inside. */}
      <MenuButton
        h="24px"
        px="8px"
        borderRadius="full"
        border="1px dashed"
        borderColor="customGray.300"
        bg="white"
        _hover={{ borderColor: "customGray.400" }}
      >
        <HStack spacing="6px" h="100%" align="center">
          <Text fontSize="12px" fontWeight="500" color="customGray.700">{label}</Text>
          <AddIcon boxSize="8px" color="customGray.600" />
        </HStack>
      </MenuButton>
      <MenuList minW="200px" boxShadow="0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)">
        {options.map((option) => (
          <MenuItem key={option} fontSize="14px" onClick={() => onSelect(option)}>{option}</MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

/**
 * The agent's identity and configuration: who it is, what it can reach, what it
 * knows, and how it should behave. Lives in the builder's Build tab, beside the
 * live widget preview.
 */
export function AgentConfigPanel({
  name,
  onNameChange,
  config,
  onConfigChange,
  tone,
  onToneChange,
  responseLength,
  onResponseLengthChange,
  instructions,
  onInstructionsChange,
  onAddKnowledgeFile,
  markVariant = 0,
}: {
  name: string;
  onNameChange: (value: string) => void;
  config: AgentConfig;
  onConfigChange: (patch: Partial<AgentConfig>) => void;
  tone: string;
  onToneChange: (value: string) => void;
  responseLength: string;
  onResponseLengthChange: (value: string) => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  onAddKnowledgeFile: (file: File) => void;
  /** The agent's id, so its face matches the colour on the list page. */
  markVariant?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [isMessageCollapsedByUser, setIsMessageCollapsedByUser] = useState(false);
  const hasEditedMessageRef = useRef(false);
  const [isMessageOverflowing, setIsMessageOverflowing] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [messageHeight, setMessageHeight] = useState(MESSAGE_COLLAPSED_MAX_HEIGHT);
  const messageMirrorRef = useRef<HTMLDivElement>(null);
  const [areFieldsOpen, setAreFieldsOpen] = useState(true);
  const [focusFieldIndex, setFocusFieldIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Size the field to its content: the collapsed height when folded, and the
  // text's own height (capped) when expanded — so deleting text shrinks it back
  // instead of leaving an empty box. Expand only appears when there is more
  // text than the collapsed height can show.
  useEffect(() => {
    // Measure a hidden mirror rather than the textarea: its own scrollHeight
    // is affected by whatever an extension (Grammarly and friends) has done to
    // the element, which left the box taller than the text needed.
    const mirror = messageMirrorRef.current;
    const node = messageRef.current;
    if (!mirror || !node) return;
    // The field keeps its own vertical padding, so the text height alone is
    // short by that much — without it the box is smaller than the text and the
    // content scrolls up instead of the box growing.
    const style = window.getComputedStyle(node);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    // Round up and leave 2px for descenders — a floored height clips them.
    const textHeight = Math.max(mirror.getBoundingClientRect().height, MESSAGE_LINE_HEIGHT);
    const contentHeight = Math.ceil(textHeight + padding) + 2;

    const overflows = contentHeight > MESSAGE_COLLAPSED_MAX_HEIGHT + 1;
    setIsMessageOverflowing(overflows);

    // Never override an explicit choice — only nudge the state at the edges:
    // fold when the text no longer overflows, and open up when typing pushes
    // past four lines (but not on load, and not after a manual collapse).
    if (!overflows && isMessageExpanded) {
      setIsMessageExpanded(false);
    } else if (
      overflows &&
      !isMessageExpanded &&
      hasEditedMessageRef.current &&
      !isMessageCollapsedByUser
    ) {
      setIsMessageExpanded(true);
    }

    // Expanded it simply follows the text; collapsed it stops at four lines.
    setMessageHeight(
      isMessageExpanded && overflows ? contentHeight : Math.min(contentHeight, MESSAGE_COLLAPSED_MAX_HEIGHT)
    );
    // Shrinking can leave the field scrolled part-way, clipping the first line.
    if (!isMessageExpanded) node.scrollTop = 0;
  }, [instructions, isMessageExpanded, isMessageCollapsedByUser]);

  const moveField = (from: number | null, to: number) => {
    setDragIndex(null);
    setDropIndex(null);
    if (from === null || from === to) return;
    const fields = [...(config.fields || [])];
    const [moved] = fields.splice(from, 1);
    fields.splice(to, 0, moved);
    onConfigChange({ fields });
  };

  const toggleFrom = (list: string[] | undefined, value: string) => {
    const current = list || [];
    return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
  };

  return (
    <Box
      flex="1"
      minW="0"
      h="100%"
      minH="0"
      bg="white"
      borderRight="1px solid"
      borderColor="customGray.200"
      overflowX="hidden"
      overflowY="auto"
      sx={HIDE_NATIVE_SCROLLBAR_SX}
    >
      <Box w="100%" maxW="892px" mx="auto" px="120px" pt="60px">
      {/* Identity */}
      <HStack align="flex-start" spacing="16px">
        <AgentMark size={56} variant={markVariant} />
        <Box flex="1" minW="0" pt="2px">
          <HStack spacing="10px" align="center" minW="0">
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Untitled"
              variant="unstyled"
              fontSize="20px"
              fontWeight="600"
              color="customGray.800"
              flex="1"
              minW="0"
            />
          </HStack>
          <Input
            value={config.description || ""}
            onChange={(event) => onConfigChange({ description: event.target.value })}
            placeholder="Add a short description"
            variant="unstyled"
            fontSize="14px"
            color="customGray.500"
            mt="4px"
            _placeholder={{ color: "customGray.400" }}
          />
        </Box>
      </HStack>

      {/* Configuration */}
      {/* Two columns: Category | Tone, then Knowledge base | Skills. */}
      <SimpleGrid columns={2} spacingX="32px" spacingY="0" mt="32px">
        <DetailRow label="Category">
          <ChoiceChip
            value={config.category}
            placeholder="Choose a category"
            options={AGENT_CATEGORIES}
            onChange={(value) => onConfigChange({ category: value })}
          />
        </DetailRow>

        {/* A human-handled chatbot has no tone until someone sets one, so this
            starts as an Add affordance rather than preset chips. */}
        <DetailRow label="Tone">
          {config.toneSet ? (
            <>
              <Chip onRemove={() => onConfigChange({ toneSet: false })}>{tone}</Chip>
              <ChoiceChip
                value={responseLength}
                placeholder="Response length"
                options={AGENT_RESPONSE_LENGTHS}
                onChange={onResponseLengthChange}
              />
            </>
          ) : (
            <AddChoiceMenu
              options={AGENT_TONES}
              onSelect={(value) => {
                onToneChange(value);
                onConfigChange({ toneSet: true });
              }}
            />
          )}
        </DetailRow>

        <DetailRow label="Knowledge base">
          {(config.knowledge || []).map((file) => (
            <Chip
              key={file.id}
              onRemove={() => onConfigChange({ knowledge: (config.knowledge || []).filter((entry) => entry.id !== file.id) })}
            >
              {file.name}
            </Chip>
          ))}
          <HStack
            as="button"
            spacing="6px"
            h="24px"
            px="8px"
            borderRadius="full"
            border="1px dashed"
            borderColor="customGray.300"
            bg="white"
            _hover={{ borderColor: "customGray.400" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Text fontSize="12px" fontWeight="500" color="customGray.700">Add</Text>
            <AddIcon boxSize="8px" color="customGray.600" />
          </HStack>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.doc,.docx"
            display="none"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onAddKnowledgeFile(file);
            }}
          />
        </DetailRow>

        <DetailRow label="Skills">
          {(config.skills || []).map((skill) => (
            <Chip key={skill} onRemove={() => onConfigChange({ skills: toggleFrom(config.skills, skill) })}>
              {skill}
            </Chip>
          ))}
          <AddChoiceMenu
            options={AGENT_SKILLS.filter((skill) => !(config.skills || []).includes(skill))}
            onSelect={(value) => onConfigChange({ skills: toggleFrom(config.skills, value) })}
          />
        </DetailRow>
      </SimpleGrid>

      <Box h="1px" bg="customGray.200" my="24px" />

      {/* Collapsible section: heading row with its own rule underneath. */}
      <Text fontSize="16px" fontWeight="600" color="customGray.800" pb="4px">Welcome message</Text>

      <Box>
        {/* Inline editor: no field chrome, just the text. The cap is enforced
            but never shown — no counter in the corner. Long text fades out at
            the fold with an Expand affordance rather than scrolling. */}
        <Box position="relative">
          {/* Invisible twin of the field, measured to size it to its text. */}
          <Box
            ref={messageMirrorRef}
            aria-hidden
            position="absolute"
            top="0"
            left="0"
            w="100%"
            visibility="hidden"
            pointerEvents="none"
            zIndex={-1}
            fontSize="14px"
            lineHeight="1.6"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
          >
            {instructions || " "}
          </Box>
          <Textarea
            ref={messageRef}
            value={instructions}
            onChange={(event) => {
              hasEditedMessageRef.current = true;
              onInstructionsChange(event.target.value);
            }}
            onFocus={() => {
              hasEditedMessageRef.current = true;
              // Clicking in to edit opens it up — you shouldn't have to hit
              // Expand first to see what you're typing into.
              setIsMessageCollapsedByUser(false);
              setIsMessageExpanded(true);
            }}
            placeholder="Define how this agent should behave — its role, workflow, and tone."
            maxLength={MAX_INSTRUCTIONS_LENGTH}
            variant="unstyled"
            h={`${messageHeight}px`}
            minH={`${Math.round(MESSAGE_LINE_HEIGHT)}px`}
            py="0"
            borderRadius="0"
            mt="0"
            fontSize="14px"
            lineHeight="1.6"
            color="customGray.600"
            resize="none"
            overflowY="hidden"
            sx={HIDE_NATIVE_SCROLLBAR_SX}
            _placeholder={{ color: "customGray.400" }}
          />

          {/* Collapsed, the pill floats over the faded last line. Expanded,
              it sits below the text so it never covers a word. */}
          {isMessageOverflowing && !isMessageExpanded && (
            <>
              <Box
                position="absolute"
                left="0"
                right="0"
                bottom="0"
                h="64px"
                pointerEvents="none"
                bgGradient="linear(to-b, rgba(255,255,255,0), white)"
              />
              <HStack
                as="button"
                position="absolute"
                bottom="0"
                left="50%"
                transform="translateX(-50%)"
                spacing="6px"
                h="28px"
                px="10px"
                bg="white"
                border="1px solid"
                borderColor="customGray.200"
                borderRadius="8px"
                boxShadow="0 1px 2px rgba(0, 0, 0, 0.05)"
                _hover={{ borderColor: "customGray.300" }}
                onClick={() => {
                  setIsMessageCollapsedByUser(false);
                  setIsMessageExpanded(true);
                }}
              >
                <ChevronDownIcon boxSize="14px" color="customGray.600" />
                <Text fontSize="13px" color="customGray.700">Expand</Text>
              </HStack>
            </>
          )}
        </Box>

        {isMessageExpanded && (
          <HStack justify="center">
            <HStack
              as="button"
              spacing="6px"
              h="28px"
              px="10px"
              bg="white"
              border="1px solid"
              borderColor="customGray.200"
              borderRadius="8px"
              boxShadow="0 1px 2px rgba(0, 0, 0, 0.05)"
              _hover={{ borderColor: "customGray.300" }}
              onClick={() => {
                setIsMessageCollapsedByUser(true);
                setIsMessageExpanded(false);
              }}
            >
              <ChevronDownIcon boxSize="14px" color="customGray.600" transform="rotate(180deg)" />
              <Text fontSize="13px" color="customGray.700">Collapse</Text>
            </HStack>
          </HStack>
        )}
      </Box>

      {/* Fields the chatbot collects before handing off to a person. */}
      <Box
        mt="32px"
        px="0"
        py="14px"
        borderTop="1px solid"
        borderBottom="1px solid"
        borderColor="customGray.200"
      >
        <HStack justify="space-between">
          <HStack spacing="6px">
            {/* The disclosure is its own icon button — the tint lives here
                rather than on the whole row. */}
            <IconButton
              aria-label={areFieldsOpen ? "Hide quick prompts" : "Show quick prompts"}
              size="xs"
              variant="ghost"
              borderRadius="6px"
              color="customGray.600"
              _hover={{ bg: "customDark.5" }}
              icon={
                <TriangleDownIcon
                  boxSize="9px"
                  transform={areFieldsOpen ? "rotate(0deg)" : "rotate(-90deg)"}
                  transition="transform 0.15s"
                />
              }
              onClick={() => setAreFieldsOpen((open) => !open)}
            />
            <HStack spacing="4px">
              <Text fontSize="14px" fontWeight="500" color="customGray.800">Quick prompts</Text>
              <Text fontSize="14px" fontWeight="500" color="customGray.500">
                ( {(config.fields || []).length} )
              </Text>
            </HStack>
          </HStack>

          <Button
            size="xs"
            h="28px"
            px="10px"
            bg="white"
            border="1px solid"
            borderColor="customGray.200"
            borderRadius="8px"
            boxShadow="0 1px 2px rgba(0, 0, 0, 0.05)"
            fontSize="13px"
            fontWeight="500"
            color="customGray.700"
            iconSpacing="8px"
            rightIcon={<AddIcon boxSize="9px" />}
            isDisabled={(config.fields || []).length >= MAX_QUICK_PROMPTS}
            _hover={{ bg: "customGray.50" }}
            onClick={() => {
              if ((config.fields || []).length >= MAX_QUICK_PROMPTS) return;
              // Add the row immediately and put the cursor in its name.
              const existing = config.fields || [];
              let name = "New field";
              let suffix = 2;
              while (existing.includes(name)) name = `New field ${suffix++}`;
              onConfigChange({ fields: [...existing, name] });
              setAreFieldsOpen(true);
              setFocusFieldIndex(existing.length);
            }}
          >
            Create
          </Button>
        </HStack>

        {areFieldsOpen && (
          <Box pt="10px">
            {/* One row per field: a type glyph, then two editable cells — the
                field's name and the value the chatbot collects. */}
            <VStack align="stretch" spacing="0">
              {(config.fields || []).map((field, index) => {
                const cellStyles = {
                  h: "34px",
                  px: "12px",
                  fontSize: "14px",
                  // Long prompts trail off rather than being clipped mid-glyph.
                  textOverflow: "ellipsis",
                  color: "customGray.800",
                  bg: "transparent",
                  border: "1px solid",
                  borderColor: "transparent",
                  borderRadius: "8px",
                  _placeholder: { color: "customGray.400" },
                  _hover: { borderColor: "customGray.200", bg: "white" },
                  _focusVisible: { borderColor: "customGray.400", bg: "white", boxShadow: "none" },
                };

                const renameField = (name: string) => {
                  const fields = [...(config.fields || [])];
                  fields[index] = name;
                  const values = { ...(config.fieldValues || {}) };
                  if (values[field] !== undefined) {
                    values[name] = values[field];
                    delete values[field];
                  }
                  onConfigChange({ fields, fieldValues: values });
                };

                return (
                  <HStack
                    key={index}
                    ref={(node: HTMLDivElement | null) => {
                      rowRefs.current[index] = node;
                    }}
                    role="group"
                    position="relative"
                    spacing="0"
                    h="44px"
                    borderTop="1px solid"
                    borderColor="customGray.200"
                    bg={dropIndex === index ? "customGray.50" : undefined}
                    _hover={dragIndex === null ? { bg: "customGray.50" } : {}}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveField(dragIndex, index);
                    }}
                  >
                    {/* Both controls float outside the row, appearing on hover. */}
                    <IconButton
                      aria-label="Reorder field"
                      size="md"
                      icon={
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8.08594 13.793C8.31216 13.793 8.49609 13.9769 8.49609 14.2031C8.49595 14.4292 8.31207 14.6123 8.08594 14.6123C7.86 14.6121 7.6769 14.4291 7.67676 14.2031C7.67676 13.977 7.85991 13.7932 8.08594 13.793ZM11.9521 13.793C12.1783 13.793 12.3613 13.9769 12.3613 14.2031C12.3612 14.4292 12.1782 14.6123 11.9521 14.6123C11.726 14.6123 11.5422 14.4292 11.542 14.2031C11.542 13.9769 11.7259 13.793 11.9521 13.793ZM8.08594 9.92773C8.31216 9.92773 8.49609 10.1117 8.49609 10.3379C8.49592 10.564 8.31205 10.7471 8.08594 10.7471C7.86002 10.7468 7.67694 10.5638 7.67676 10.3379C7.67676 10.1118 7.85991 9.92797 8.08594 9.92773ZM11.9521 9.92773C12.1783 9.92778 12.3613 10.1117 12.3613 10.3379C12.3612 10.564 12.1782 10.747 11.9521 10.7471C11.726 10.7471 11.5422 10.564 11.542 10.3379C11.542 10.1117 11.7259 9.92773 11.9521 9.92773ZM8.08594 6.0625C8.31202 6.0625 8.49586 6.24566 8.49609 6.47168C8.49609 6.6979 8.31216 6.88184 8.08594 6.88184C7.85991 6.8816 7.67676 6.69776 7.67676 6.47168C7.67699 6.2458 7.86006 6.06274 8.08594 6.0625ZM11.9521 6.0625C12.1782 6.06255 12.3611 6.24569 12.3613 6.47168C12.3613 6.69787 12.1783 6.88179 11.9521 6.88184C11.7259 6.88184 11.542 6.6979 11.542 6.47168C11.5422 6.24566 11.7261 6.0625 11.9521 6.0625Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      }
                      variant="ghost"
                      position="absolute"
                      left="-44px"
                      color="customGray.400"
                      opacity={0}
                      cursor="grab"
                      draggable
                      onDragStart={(event) => {
                        // Drag the whole row, not just the little handle. The
                        // snapshot is taken synchronously, so the hover tint and
                        // the delete button are hidden for that instant and put
                        // back on the next frame.
                        const row = rowRefs.current[index];
                        if (row) {
                          const remove = row.querySelector<HTMLElement>("[data-row-delete]");
                          const previousBg = row.style.backgroundColor;
                          const previousBorder = row.style.borderColor;
                          if (remove) remove.style.visibility = "hidden";
                          row.style.backgroundColor = "#ffffff";
                          row.style.borderColor = "transparent";
                          event.dataTransfer.setDragImage(row, 24, row.offsetHeight / 2);
                          requestAnimationFrame(() => {
                            if (remove) remove.style.visibility = "";
                            row.style.backgroundColor = previousBg;
                            row.style.borderColor = previousBorder;
                          });
                        }
                        event.dataTransfer.effectAllowed = "move";
                        setDragIndex(index);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                      _groupHover={{ opacity: 1 }}
                      _hover={{ bg: "transparent", color: "customGray.600" }}
                    />
                    <HStack w="40%" minW="0" spacing="8px" pl="30px" pr="6px">
                      <Text fontSize="14px" color="customGray.500" flexShrink={0}>#</Text>
                      <Input
                        autoFocus={focusFieldIndex === index}
                        onFocus={(event) => event.target.select()}
                        value={field}
                        onChange={(event) => renameField(event.target.value)}
                        onBlur={(event) => {
                          setFocusFieldIndex(null);
                          // An emptied name removes the field.
                          if (!event.target.value.trim()) {
                            onConfigChange({ fields: (config.fields || []).filter((_, i) => i !== index) });
                          }
                        }}
                        placeholder="Field name"
                        {...cellStyles}
                      />
                    </HStack>

                    <Box flex="1" minW="0" pr="8px">
                      <Input
                        value={(config.fieldValues || {})[field] || ""}
                        onChange={(event) =>
                          onConfigChange({ fieldValues: { ...(config.fieldValues || {}), [field]: event.target.value } })
                        }
                        placeholder="—"
                        {...cellStyles}
                      />
                    </Box>

                    <IconButton
                      aria-label={`Delete ${field}`}
                      data-row-delete
                      size="md"
                      display={dragIndex === null ? undefined : "none"}
                      icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.4168 7.83333V17.8333C17.4168 18.2754 17.2412 18.6993 16.9287 19.0118C16.6161 19.3244 16.1922 19.5 15.7502 19.5H8.25016C7.80814 19.5 7.38421 19.3244 7.07165 19.0118C6.75909 18.6993 6.5835 18.2754 6.5835 17.8333V7.83333M18.6668 7.83333H5.3335M9.0835 7.83333V7.41667C9.0835 6.64312 9.39079 5.90125 9.93777 5.35427C10.4847 4.80729 11.2266 4.5 12.0002 4.5C12.7737 4.5 13.5156 4.80729 14.0626 5.35427C14.6095 5.90125 14.9168 6.64312 14.9168 7.41667V7.83333M10.3335 15.3333V12M13.6668 15.3333V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      }
                      variant="ghost"
                      position="absolute"
                      right="-44px"
                      color="customGray.500"
                      opacity={0}
                      _groupHover={{ opacity: 1 }}
                      _hover={{ bg: "transparent", color: "red.500" }}
                      onClick={() => {
                        const values = { ...(config.fieldValues || {}) };
                        delete values[field];
                        onConfigChange({
                          fields: (config.fields || []).filter((_, i) => i !== index),
                          fieldValues: values,
                        });
                      }}
                    />
                  </HStack>
                );
              })}
              {(config.fields || []).length === 0 && (
                <Text fontSize="13px" color="customGray.500" pl="8px" py="6px">No quick prompts yet — add one with Create</Text>
              )}
            </VStack>
          </Box>
        )}
      </Box>
      </Box>
    </Box>
  );
}
