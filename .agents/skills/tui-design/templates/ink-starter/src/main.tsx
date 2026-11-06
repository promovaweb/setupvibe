import React, {useState} from 'react';
import {render, Box, Text, useApp, useInput} from 'ink';

// --- Theme ---

const c = {
  base: '252',
  muted: '243',
  accent: '86',
  success: '78',
};

// --- Data ---

const NAV_ITEMS = ['Dashboard', 'Records', 'Logs', 'Settings'];

const SCREEN_CONTENT: Record<string, string[]> = {
  Dashboard: ['Welcome back, user', '', 'Recent Activity', '  3 new records today', '  Last sync: 2 min ago'],
  Records: ['No records loaded', '', 'Press Enter to browse.'],
  Logs: ['No recent logs.', '', 'Waiting for events...'],
  Settings: ['Theme: Dark', 'Notifications: On', 'Auto-refresh: 30s'],
};

const HELP_LINES = [
  'j/k      Navigate the sidebar',
  'Enter    Select the highlighted item',
  '?        Toggle this help',
  'q        Quit',
];

// --- Components ---

const Sidebar: React.FC<{
  items: string[];
  selected: number;
  width: number;
}> = ({items, selected, width}) => (
  <Box
    flexDirection="column"
    width={width}
    borderStyle="round"
    borderColor={c.muted}
    paddingX={1}
    paddingY={1}
  >
    <Text bold>NAVIGATION</Text>
    <Box marginTop={1} flexDirection="column">
      {items.map((item, i) => (
        <Text key={item} color={i === selected ? c.accent : c.base}>
          {i === selected ? '▸ ' : '  '}
          {item}
        </Text>
      ))}
    </Box>
  </Box>
);

const Content: React.FC<{
  screen: string;
  showHelp: boolean;
}> = ({screen, showHelp}) => {
  const lines = showHelp ? HELP_LINES : SCREEN_CONTENT[screen] ?? [];
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={c.accent}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={c.accent}>
        {(showHelp ? 'Help' : screen).toUpperCase()}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {lines.map((line, i) => (
          <Text key={i} color={c.base}>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

const StatusBar: React.FC<{hints: string}> = ({hints}) => (
  <Box width="100%" paddingX={2}>
    <Text color={c.success}>● Connected</Text>
    <Text color={c.muted}>  {hints}</Text>
  </Box>
);

// --- App ---

const App = () => {
  const {exit} = useApp();
  const [cursor, setCursor] = useState(0);
  const [screen, setScreen] = useState(NAV_ITEMS[0]);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (input === '?') {
      setShowHelp(prev => !prev);
      return;
    }
    if (input === 'j' || key.downArrow) {
      setCursor(prev => Math.min(prev + 1, NAV_ITEMS.length - 1));
    }
    if (input === 'k' || key.upArrow) {
      setCursor(prev => Math.max(prev - 1, 0));
    }
    if (key.return) {
      setScreen(NAV_ITEMS[cursor]);
      setShowHelp(false);
    }
  });

  const sidebarWidth = 22;

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="row">
        <Sidebar items={NAV_ITEMS} selected={cursor} width={sidebarWidth} />
        <Content screen={screen} showHelp={showHelp} />
      </Box>
      <StatusBar hints="j/k: navigate  Enter: select  ?: help  q: quit" />
    </Box>
  );
};

// --- Entry ---

render(<App />);
