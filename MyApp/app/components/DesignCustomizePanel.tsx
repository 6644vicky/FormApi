"use client";

import { useState } from "react";
import {
  Box,
  HStack,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Switch,
  Text,
  Textarea,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, InfoOutlineIcon } from "@chakra-ui/icons";

// What the Design tab's Customize panel controls. Every field here is applied
// to the booking flow — the builder preview and the public booking page — so
// the panel has no controls that don't visibly do something.
export type DesignSettings = {
  textColor: string;
  uiElementsColor: string;
  buttonsColor: string;
  alertsColor: string;
  fontFamily: string;
  contentAreaColor: string;
  backgroundColor: string;
  footerEnabled: boolean;
  footerText: string;
};

// Defaults mirror the booking page as it looks today, so opening the tab
// changes nothing until something is actually edited.
export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  textColor: "#27272A",
  uiElementsColor: "#3F3F46",
  buttonsColor: "#27272A",
  alertsColor: "#E53E3E",
  fontFamily: "Inter",
  contentAreaColor: "#FFFFFF",
  backgroundColor: "#FAFAFA",
  footerEnabled: true,
  footerText: "By proceeding, you agree to Cal.com's Terms and Privacy Policy.",
};

// Loaded app-wide in layout.tsx, so any of these can be used without a
// per-event webfont request.
export const FONT_OPTIONS = ["Inter", "DM Sans", "Poppins", "Roboto", "Open Sans", "Lato"];

export const FONT_STACKS: Record<string, string> = {
  Inter: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "DM Sans": 'var(--font-dm-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  Poppins: 'var(--font-poppins), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  Roboto: 'var(--font-roboto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "Open Sans": 'var(--font-open-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  Lato: 'var(--font-lato), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export function fontStackFor(fontFamily: string): string {
  return FONT_STACKS[fontFamily] || FONT_STACKS.Inter;
}

const SWITCH_SX = { "span.chakra-switch__track[data-checked]": { bg: "brand.primary" } };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Box borderBottom="1px solid" borderColor="customGray.200">
      <HStack
        as="button"
        w="100%"
        justify="space-between"
        align="center"
        px="20px"
        py="16px"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Text fontSize="12px" fontWeight="600" letterSpacing="0.06em" color="customGray.500">
          {title}
        </Text>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} w="18px" h="18px" color="customGray.500" />
      </HStack>
      {isOpen && (
        <VStack align="stretch" spacing="18px" px="20px" pb="20px">
          {children}
        </VStack>
      )}
    </Box>
  );
}

// The panel stores plain hex; these only change how a value is displayed.
export const COLOR_FORMATS = ["Hex", "RGB", "CSS", "HSL", "HSB"] as const;
export type ColorFormat = (typeof COLOR_FORMATS)[number];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const [rf, gf, bf] = [r / 255, g / 255, b / 255];
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: Math.round(lightness * 100) };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === rf ? ((gf - bf) / delta) % 6
    : max === gf ? (bf - rf) / delta + 2
    : (rf - gf) / delta + 4;
  return {
    h: Math.round(((hue * 60) + 360) % 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function rgbToHsb({ r, g, b }: { r: number; g: number; b: number }) {
  const [rf, gf, bf] = [r / 255, g / 255, b / 255];
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  const hue =
    delta === 0 ? 0
    : max === rf ? ((gf - bf) / delta) % 6
    : max === gf ? (bf - rf) / delta + 2
    : (rf - gf) / delta + 4;
  return {
    h: Math.round(((hue * 60) + 360) % 360),
    s: Math.round((max === 0 ? 0 : delta / max) * 100),
    b: Math.round(max * 100),
  };
}

export function formatColor(hex: string, format: ColorFormat): string {
  const rgb = hexToRgb(hex);
  if (format === "Hex") return hex.toUpperCase();
  if (format === "RGB") return `${rgb.r} ${rgb.g} ${rgb.b}`;
  if (format === "CSS") return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  if (format === "HSL") {
    const { h, s, l } = rgbToHsl(rgb);
    return `${h} ${s}% ${l}%`;
  }
  const { h, s, b } = rgbToHsb(rgb);
  return `${h} ${s}% ${b}%`;
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
  format,
  onFormatChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  format: ColorFormat;
  onFormatChange: (format: ColorFormat) => void;
}) {
  return (
    <HStack justify="space-between" align="center">
      <HStack spacing="6px">
        <Text fontSize="14px" color="customGray.800">{label}</Text>
        <Tooltip label={hint} placement="top" hasArrow bg="customGray.800" color="white" fontSize="12px">
          <InfoOutlineIcon w="12px" h="12px" color="customGray.400" />
        </Tooltip>
      </HStack>
      <HStack spacing="8px" minW="0">
        {/* Picking a format here switches every colour row, the way a design
            tool's picker does — it's a display preference, not per-colour. */}
        <Menu placement="bottom-end" autoSelect={false}>
          <MenuButton
            as={Box}
            role="button"
            display="inline-flex"
            alignItems="center"
            gap="2px"
            flexShrink={0}
            cursor="pointer"
            fontSize="11px"
            fontWeight="500"
            color="customGray.600"
            _hover={{ color: "customGray.800" }}
          >
            {format.toUpperCase()}
            <ChevronDownIcon w="12px" h="12px" />
          </MenuButton>
          <MenuList minW="120px" fontSize="14px" zIndex={20}>
            {COLOR_FORMATS.map((option) => (
              <MenuItem key={option} onClick={() => onFormatChange(option)}>{option}</MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Text fontSize="12px" color="customGray.500" isTruncated>{formatColor(value, format)}</Text>
        <Box
          as="label"
          w="30px"
          h="30px"
          borderRadius="6px"
          border="1px solid"
          borderColor="customGray.200"
          bg={value}
          cursor="pointer"
          flexShrink={0}
          overflow="hidden"
        >
          <Input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            opacity={0}
            w="100%"
            h="100%"
            p="0"
            border="none"
            cursor="pointer"
          />
        </Box>
      </HStack>
    </HStack>
  );
}

export function DesignCustomizePanel({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => void;
}) {
  // How colour values are written out. A display preference shared by every
  // row, so it isn't part of the saved DesignSettings.
  const [colorFormat, setColorFormat] = useState<ColorFormat>("Hex");

  return (
    <VStack align="stretch" spacing="0px" w="400px">
      <HStack justify="space-between" align="center" px="20px" py="18px" borderBottom="1px solid" borderColor="customGray.200">
        <Text fontSize="18px" fontWeight="600" color="customGray.800">Customize</Text>
      </HStack>

      <Section title="CONTENTS">
        <ColorRow
          label="Text color"
          hint="Headings, field labels and body text on the booking page."
          value={settings.textColor}
          onChange={(value) => onChange("textColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
        <ColorRow
          label="UI elements"
          hint="The selected date and time slot on the calendar."
          value={settings.uiElementsColor}
          onChange={(value) => onChange("uiElementsColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
        <ColorRow
          label="Buttons"
          hint="Confirm and Schedule Event buttons, and the Add guests link."
          value={settings.buttonsColor}
          onChange={(value) => onChange("buttonsColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
        <ColorRow
          label="Alerts"
          hint="The asterisk marking a required question."
          value={settings.alertsColor}
          onChange={(value) => onChange("alertsColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
        <HStack justify="space-between" align="center">
          <Text fontSize="14px" color="customGray.800">Font</Text>
          <Menu placement="bottom-end" autoSelect={false}>
            <MenuButton
              as={Box}
              role="button"
              display="inline-flex"
              alignItems="center"
              gap="4px"
              cursor="pointer"
              fontSize="14px"
              color="customGray.700"
              _hover={{ color: "customGray.900" }}
            >
              {settings.fontFamily}
              <ChevronDownIcon w="16px" h="16px" color="customGray.500" />
            </MenuButton>
            <MenuList minW="160px" fontSize="14px" zIndex={20}>
              {FONT_OPTIONS.map((option) => (
                <MenuItem key={option} fontFamily={fontStackFor(option)} onClick={() => onChange("fontFamily", option)}>
                  {option}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>
      </Section>

      <Section title="PAGE SETTINGS">
        <ColorRow
          label="Content Area"
          hint="The booking card itself."
          value={settings.contentAreaColor}
          onChange={(value) => onChange("contentAreaColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
        <ColorRow
          label="Background"
          hint="The page behind the booking card."
          value={settings.backgroundColor}
          onChange={(value) => onChange("backgroundColor", value)}
          format={colorFormat}
          onFormatChange={setColorFormat}
        />
      </Section>

      <Section title="FOOTER">
        <HStack justify="space-between" align="center">
          <Text fontSize="14px" color="customGray.800">Show footer</Text>
          <Switch
            isChecked={settings.footerEnabled}
            onChange={(event) => onChange("footerEnabled", event.target.checked)}
            sx={SWITCH_SX}
          />
        </HStack>
        {settings.footerEnabled && (
          <VStack align="stretch" spacing="6px">
            <Text fontSize="12px" fontWeight="500" color="customGray.800">Footer text</Text>
            <Textarea
              rows={3}
              fontSize="14px"
              borderRadius="8px"
              borderColor="customGray.200"
              value={settings.footerText}
              onChange={(event) => onChange("footerText", event.target.value)}
              _hover={{ borderColor: "customGray.400" }}
              _focusVisible={{ borderColor: "customGray.500", boxShadow: "0 0 0 3px rgba(39, 39, 42, 0.1)" }}
            />
          </VStack>
        )}
      </Section>
    </VStack>
  );
}
