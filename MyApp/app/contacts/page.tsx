"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, AtSignIcon, ChevronDownIcon, DownloadIcon, DragHandleIcon, LinkIcon, SearchIcon } from "@chakra-ui/icons";
import Sidebar from "@/app/components/Sidebar";
import FullPageLoader from "@/app/components/FullPageLoader";
import { FloatingScrollbar, HIDE_NATIVE_SCROLLBAR_SX } from "@/app/components/FloatingScrollbar";
import { supabase, syncServerSession } from "@/lib/supabase";

type BookingRow = {
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_date: string;
  created_at: string;
};

type Person = {
  key: string;
  name: string;
  email: string;
  phone: string;
  bookings: number;
  firstSeen: string;
  lastSeen: string;
};

type Company = {
  key: string;
  name: string;
  domain: string;
  people: number;
  bookings: number;
  firstSeen: string;
  lastSeen: string;
};

// Rotating avatar colours, matching the events and bookings tables.
const AVATAR_COLORS = ["#EA8C55", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899"];

const PEOPLE_COLUMNS = ["Name", "Email", "Phone", "Bookings", "First seen", "Last seen"];
const COMPANY_COLUMNS = ["Name", "Domain", "People", "Bookings", "First seen", "Last seen"];

const DATE_FILTERS = ["All time", "Last 7 days", "Last 30 days", "Last 90 days"];

function PanelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M5 4.16667C4.77899 4.16667 4.56702 4.25446 4.41074 4.41074C4.25446 4.56702 4.16667 4.77899 4.16667 5V15C4.16667 15.221 4.25446 15.433 4.41074 15.5893C4.56702 15.7455 4.77899 15.8333 5 15.8333H6.66667V4.16667H5ZM8.33333 4.16667V15.8333H15C15.221 15.8333 15.433 15.7455 15.5893 15.5893C15.7455 15.433 15.8333 15.221 15.8333 15V5C15.8333 4.77899 15.7455 4.56702 15.5893 4.41074C15.433 4.25446 15.221 4.16667 15 4.16667H8.33333ZM2.5 5C2.5 4.33696 2.76339 3.70107 3.23223 3.23223C3.70107 2.76339 4.33696 2.5 5 2.5H15C15.663 2.5 16.2989 2.76339 16.7678 3.23223C17.2366 3.70107 17.5 4.33696 17.5 5V15C17.5 15.663 17.2366 16.2989 16.7678 16.7678C16.2989 17.2366 15.663 17.5 15 17.5H5C4.33696 17.5 3.70107 17.2366 3.23223 16.7678C2.76339 16.2989 2.5 15.663 2.5 15V5Z" fill="currentColor"/>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4H14M4.66667 8H11.3333M6.66667 12H9.33333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.66667 10.667L11.3333 13.3337L14 10.667M11.3333 13.3337V2.66699M7.33333 5.33366L4.66667 2.66699L2 5.33366M4.66667 2.66699V13.3337" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatSeen(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function colorFor(seed: string) {
  const sum = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function ContactsPage() {
  const router = useRouter();
  const toast = useToast({ position: "top" });

  const [selectedNav, setSelectedNav] = useState("Contacts");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const [section, setSection] = useState<"People" | "Companies">("People");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("All time");
  const [sortBy, setSortBy] = useState("Last seen");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isSegmentsOpen, setIsSegmentsOpen] = useState(true);
  // Saved views of the current search + filter. Session-only for now — there's
  // no segments table behind this yet.
  const [segments, setSegments] = useState<{ name: string; search: string; dateFilter: string }[]>([]);
  // The list scrolls natively with its own bar hidden; a FloatingScrollbar
  // sibling draws the thumb over the top so nothing is inset.
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      await syncServerSession(session);
      setUserEmail(session.user.email || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || "");

      // RLS on `bookings` already scopes rows to events this user owns.
      const { data, error } = await supabase
        .from("bookings")
        .select("guest_name, guest_email, guest_phone, booking_date, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading contacts:", error);
      } else {
        setBookings((data || []) as BookingRow[]);
      }
      setIsLoading(false);
    })();
  }, [router]);

  // Everyone who has ever booked, collapsed by email (falling back to name for
  // bookings saved without one).
  const people = useMemo<Person[]>(() => {
    const byKey = new Map<string, Person>();
    for (const booking of bookings) {
      const email = (booking.guest_email || "").trim().toLowerCase();
      const name = (booking.guest_name || "").trim();
      const key = email || name.toLowerCase();
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        existing.bookings += 1;
        existing.name = existing.name || name;
        existing.phone = existing.phone || (booking.guest_phone || "");
        if (booking.created_at < existing.firstSeen) existing.firstSeen = booking.created_at;
        if (booking.created_at > existing.lastSeen) existing.lastSeen = booking.created_at;
      } else {
        byKey.set(key, {
          key,
          name: name || "No name provided",
          email,
          phone: booking.guest_phone || "",
          bookings: 1,
          firstSeen: booking.created_at,
          lastSeen: booking.created_at,
        });
      }
    }
    return [...byKey.values()];
  }, [bookings]);

  // Grouped by email domain — the closest thing to a company this data has.
  const companies = useMemo<Company[]>(() => {
    const byDomain = new Map<string, Company & { emails: Set<string> }>();
    for (const person of people) {
      const domain = person.email.split("@")[1];
      if (!domain) continue;
      const existing = byDomain.get(domain);
      if (existing) {
        existing.emails.add(person.email);
        existing.people = existing.emails.size;
        existing.bookings += person.bookings;
        if (person.firstSeen < existing.firstSeen) existing.firstSeen = person.firstSeen;
        if (person.lastSeen > existing.lastSeen) existing.lastSeen = person.lastSeen;
      } else {
        byDomain.set(domain, {
          key: domain,
          name: domain.split(".")[0].replace(/^./, (char) => char.toUpperCase()),
          domain,
          people: 1,
          bookings: person.bookings,
          firstSeen: person.firstSeen,
          lastSeen: person.lastSeen,
          emails: new Set([person.email]),
        });
      }
    }
    return [...byDomain.values()].map(({ emails, ...company }) => company);
  }, [people]);

  const cutoffDate = useMemo(() => {
    const days = { "Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90 }[dateFilter];
    if (!days) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString();
  }, [dateFilter]);

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source: (Person | Company)[] = section === "People" ? people : companies;
    const filtered = source.filter((row) => {
      if (cutoffDate && row.lastSeen < cutoffDate) return false;
      if (!query) return true;
      const haystack = section === "People"
        ? `${(row as Person).name} ${(row as Person).email}`
        : `${(row as Company).name} ${(row as Company).domain}`;
      return haystack.toLowerCase().includes(query);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      if (sortBy === "Bookings") return b.bookings - a.bookings;
      if (sortBy === "First seen") return b.firstSeen.localeCompare(a.firstSeen);
      return b.lastSeen.localeCompare(a.lastSeen);
    });
  }, [section, people, companies, searchQuery, cutoffDate, sortBy]);

  const columns = section === "People" ? PEOPLE_COLUMNS : COMPANY_COLUMNS;
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column));

  const exportCsv = () => {
    const header = visibleColumns.join(",");
    const body = rows.map((row) =>
      visibleColumns
        .map((column) => {
          const value =
            column === "Name" ? row.name
            : column === "Email" ? (row as Person).email
            : column === "Phone" ? (row as Person).phone
            : column === "Domain" ? (row as Company).domain
            : column === "People" ? (row as Company).people
            : column === "Bookings" ? row.bookings
            : column === "First seen" ? formatSeen(row.firstSeen)
            : formatSeen(row.lastSeen);
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${section.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${rows.length} ${section.toLowerCase()}`, status: "success", isClosable: true });
  };

  const saveSegment = () => {
    const name = searchQuery.trim() || dateFilter;
    if (segments.some((segment) => segment.name === name)) return;
    setSegments((prev) => [...prev, { name, search: searchQuery, dateFilter }]);
    setIsSegmentsOpen(true);
  };

  if (isLoading) return <FullPageLoader />;

  const toolbarButton = {
    size: "sm" as const,
    variant: "ghost" as const,
    fontSize: "14px",
    fontWeight: "400",
    color: "customGray.700",
    _hover: { bg: "customGray.100" },
  };

  return (
    <Flex h="100vh" w="100vw" bg="dark.bg" overflow="hidden" position="fixed" top={0} left={0}>
      <Sidebar
        selectedNav={selectedNav}
        onNavClick={setSelectedNav}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
      />

      <VStack flex={1} h="100vh" bg="appBg" spacing={0} align="stretch" overflow="hidden" pt="12px" pr="12px" pb="12px">
        <HStack flex={1} h="100%" align="stretch" spacing={0} bg="white" borderRadius="12px" border="1px solid" borderColor="customGray.200" overflow="hidden">
          {/* Section list */}
          <VStack w="255px" h="100%" align="stretch" spacing={0} borderRight="1px solid" borderColor="customGray.200" overflow="hidden">
            <Box px="20px" pt="20px" pb="12px">
              <Text fontSize="16px" fontWeight="600" color="customGray.800">Contacts</Text>
            </Box>
            <VStack align="stretch" spacing="2px" px="12px">
              {([
                { label: "People", icon: AtSignIcon, count: people.length },
                { label: "Companies", icon: LinkIcon, count: companies.length },
              ] as const).map((item) => {
                const isSelected = section === item.label;
                return (
                  <HStack
                    key={item.label}
                    as="button"
                    justify="space-between"
                    h="32px"
                    px="12px"
                    borderRadius="8px"
                    bg={isSelected ? "customGray.100" : "transparent"}
                    _hover={{ bg: isSelected ? "customGray.100" : "customGray.50" }}
                    onClick={() => setSection(item.label)}
                  >
                    <HStack spacing="10px">
                      <item.icon boxSize="16px" color="customGray.600" />
                      <Text fontSize="14px" fontWeight={isSelected ? "500" : "400"} color="customGray.800">{item.label}</Text>
                    </HStack>
                    <Text fontSize="13px" color="customGray.500">{item.count}</Text>
                  </HStack>
                );
              })}
            </VStack>

            <HStack justify="space-between" px="24px" pt="20px" pb="4px">
              <HStack as="button" spacing="6px" onClick={() => setIsSegmentsOpen((open) => !open)}>
                <Box transform={isSegmentsOpen ? "rotate(0deg)" : "rotate(-90deg)"} transition="transform 0.2s" display="flex">
                  <ChevronDownIcon boxSize="16px" color="customGray.500" />
                </Box>
                <Text fontSize="14px" color="customGray.700">Custom segments</Text>
              </HStack>
              <IconButton
                aria-label="Save the current view as a segment"
                icon={<AddIcon boxSize="10px" />}
                size="xs"
                variant="ghost"
                color="customGray.500"
                _hover={{ bg: "customGray.100" }}
                onClick={saveSegment}
              />
            </HStack>
            {isSegmentsOpen && (
              <VStack align="stretch" spacing="2px" px="12px" pt="4px">
                {segments.length === 0 ? (
                  <Text fontSize="13px" color="customGray.400" px="12px" py="6px">No segments yet</Text>
                ) : (
                  segments.map((segment) => (
                    <HStack
                      key={segment.name}
                      as="button"
                      px="12px"
                      py="8px"
                      borderRadius="8px"
                      _hover={{ bg: "customGray.50" }}
                      onClick={() => {
                        setSearchQuery(segment.search);
                        setDateFilter(segment.dateFilter);
                        setIsSearchOpen(Boolean(segment.search));
                      }}
                    >
                      <Text fontSize="14px" color="customGray.700" isTruncated>{segment.name}</Text>
                    </HStack>
                  ))
                )}
              </VStack>
            )}
          </VStack>

          {/* Main area */}
          <VStack flex={1} h="100%" align="stretch" spacing={0} overflow="hidden">
            <HStack justify="space-between" align="center" px="24px" py="16px">
              <HStack spacing="10px">
                <Box color="customGray.700" display="flex"><PanelIcon /></Box>
                <Text fontSize="18px" fontWeight="600" color="customGray.800">{section}</Text>
              </HStack>
            </HStack>

            <HStack justify="space-between" align="center" px="24px" pb="12px">
              <HStack spacing="4px">
                <Menu placement="bottom-start" autoSelect={false}>
                  <MenuButton as={Button} leftIcon={<FilterIcon />} {...toolbarButton}>
                    {dateFilter === "All time" ? "Filter" : dateFilter}
                  </MenuButton>
                  <MenuList fontSize="14px" minW="170px">
                    {DATE_FILTERS.map((option) => (
                      <MenuItem key={option} onClick={() => setDateFilter(option)}>{option}</MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                <Menu placement="bottom-start" autoSelect={false}>
                  <MenuButton as={Button} leftIcon={<SortIcon />} {...toolbarButton}>
                    Sort
                  </MenuButton>
                  <MenuList fontSize="14px" minW="170px">
                    {["Last seen", "First seen", "Name", "Bookings"].map((option) => (
                      <MenuItem key={option} onClick={() => setSortBy(option)}>{option}</MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                {isSearchOpen ? (
                  <InputGroup w="220px" size="sm">
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon w="14px" h="14px" color="customGray.400" />
                    </InputLeftElement>
                    <Input
                      autoFocus
                      placeholder={`Search ${section.toLowerCase()}`}
                      borderRadius="8px"
                      fontSize="14px"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onBlur={() => !searchQuery && setIsSearchOpen(false)}
                    />
                  </InputGroup>
                ) : (
                  <IconButton
                    aria-label="Search"
                    icon={<SearchIcon w="16px" h="16px" />}
                    size="sm"
                    variant="ghost"
                    color="customGray.700"
                    _hover={{ bg: "customGray.100" }}
                    onClick={() => setIsSearchOpen(true)}
                  />
                )}
              </HStack>

              <HStack spacing="4px">
                <Menu placement="bottom-end" closeOnSelect={false} autoSelect={false}>
                  <MenuButton as={Button} leftIcon={<DragHandleIcon boxSize="12px" />} {...toolbarButton}>
                    Columns
                  </MenuButton>
                  <MenuList fontSize="14px" minW="190px">
                    {columns.map((column) => (
                      <MenuItem key={column} closeOnSelect={false}>
                        <Checkbox
                          size="sm"
                          isChecked={!hiddenColumns.includes(column)}
                          // Name anchors every row, so it can't be hidden.
                          isDisabled={column === "Name"}
                          onChange={(event) =>
                            setHiddenColumns((prev) =>
                              event.target.checked ? prev.filter((name) => name !== column) : [...prev, column]
                            )
                          }
                        >
                          <Text fontSize="14px">{column}</Text>
                        </Checkbox>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                <Button leftIcon={<DownloadIcon boxSize="14px" />} {...toolbarButton} onClick={exportCsv}>
                  Export
                </Button>

                <Button leftIcon={<AddIcon boxSize="10px" />} {...toolbarButton} onClick={saveSegment}>
                  New segment
                </Button>
              </HStack>
            </HStack>

            <Box flexShrink={0} w="100%" bg="customGray.50" borderTop="1px solid" borderBottom="1px solid" borderColor="customGray.200">
              <Table w="100%" sx={{ tableLayout: "fixed" }}>
                <Thead>
                  <Tr>
                    {visibleColumns.map((column, index) => (
                      <Th
                        key={column}
                        w={index === 0 ? "280px" : "150px"}
                        h="44px"
                        py="0"
                        px="0"
                        border="none"
                        textTransform="none"
                        letterSpacing="normal"
                      >
                        <Box display="flex" alignItems="center" pl={index === 0 ? "24px" : "0"} pr="24px">
                          <Text fontSize="sm" fontWeight="500" color="customGray.700">{column}</Text>
                        </Box>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
              </Table>
            </Box>

            <Box position="relative" flex="1" w="100%" minH="0">
            <FloatingScrollbar scrollRef={tableScrollRef} />
            <Box ref={tableScrollRef} h="100%" w="100%" overflowY="auto" sx={HIDE_NATIVE_SCROLLBAR_SX}>
              <Table w="100%" sx={{ tableLayout: "fixed" }}>
                <Tbody>
                  {rows.length === 0 ? (
                    <Tr>
                      <Td colSpan={visibleColumns.length} h="80px" textAlign="center" borderBottomColor="customGray.200">
                        <Text fontSize="14px" color="customGray.500">
                          {searchQuery.trim() ? `No ${section.toLowerCase()} match "${searchQuery}"` : `No ${section.toLowerCase()} yet.`}
                        </Text>
                      </Td>
                    </Tr>
                  ) : (
                    rows.map((row) => (
                      <Tr key={row.key} _hover={{ bg: "customGray.50" }} transition="background-color 0.2s">
                        {visibleColumns.map((column, index) => (
                          <Td
                            key={column}
                            w={index === 0 ? "280px" : "150px"}
                            h="56px"
                            py="0"
                            px="0"
                            borderBottomColor="customGray.200"
                          >
                            <Box display="flex" alignItems="center" pl={index === 0 ? "24px" : "0"} pr="24px">
                              {column === "Name" ? (
                                <HStack spacing="10px" minW="0">
                                  <Box
                                    w="24px"
                                    h="24px"
                                    borderRadius="full"
                                    bg={colorFor(row.key)}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                  >
                                    <Text fontSize="xs" fontWeight="medium" color="white">
                                      {(row.name || "?").charAt(0).toUpperCase()}
                                    </Text>
                                  </Box>
                                  <Text fontSize="sm" color="customGray.800" isTruncated>{row.name}</Text>
                                </HStack>
                              ) : (
                                <Text fontSize="sm" color="customGray.600" isTruncated>
                                  {column === "Email" ? (row as Person).email || "—"
                                    : column === "Phone" ? (row as Person).phone || "—"
                                    : column === "Domain" ? (row as Company).domain
                                    : column === "People" ? (row as Company).people
                                    : column === "Bookings" ? row.bookings
                                    : column === "First seen" ? formatSeen(row.firstSeen)
                                    : formatSeen(row.lastSeen)}
                                </Text>
                              )}
                            </Box>
                          </Td>
                        ))}
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
            </Box>
          </VStack>
        </HStack>
      </VStack>
    </Flex>
  );
}
