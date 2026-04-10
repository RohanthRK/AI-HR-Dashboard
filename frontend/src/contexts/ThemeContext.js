import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

export const ColorModeContext = createContext({ 
  toggleColorMode: () => {}, 
  mode: 'light' 
});

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || (prefersDarkMode ? 'dark' : 'light');
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    // Inject attribute for CSS variable targeting
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#FFD700', // Brutalist Yellow
            contrastText: '#000000',
          },
          secondary: {
            main: '#FF69B4', // Brutalist Pink
            contrastText: '#000000',
          },
          background: {
            default: mode === 'light' ? '#F4F4F0' : '#0a1219', // Premium dark or off-white
            paper: mode === 'light' ? '#FFFFFF' : '#111821',
          },
          text: {
            primary: mode === 'light' ? '#000000' : '#FFFFFF',
            secondary: mode === 'light' ? '#333333' : 'rgba(255, 255, 255, 0.85)', // Increased contrast for secondary text
          },
          divider: mode === 'light' ? '#000000' : 'rgba(255, 255, 255, 0.2)', // Better divider visibility
        },
        typography: {
          fontFamily: [
            '"Space Grotesk"',
            '"Public Sans"',
            'Inter',
            'Roboto',
            'sans-serif',
          ].join(','),
          h1: { fontWeight: 900, textTransform: 'uppercase' },
          h2: { fontWeight: 900, textTransform: 'uppercase' },
          h3: { fontWeight: 800 },
          h4: { fontWeight: 800 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700, textTransform: 'uppercase' },
          button: { textTransform: 'uppercase', fontWeight: 800 },
        },
        shape: { borderRadius: 0 },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 0,
                border: mode === 'light' ? '3px solid #000000' : '3px solid #FFFFFF',
                boxShadow: mode === 'light' ? '4px 4px 0px #000000' : '4px 4px 0px #FFD700',
                fontWeight: 800,
                transition: 'all 0.1s ease',
                '&:hover': {
                  transform: 'translate(2px, 2px)',
                  boxShadow: '2px 2px 0px #000000',
                },
              },
              containedPrimary: {
                backgroundColor: '#FFD700',
                '&:hover': { backgroundColor: '#E6C200' },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 0,
                border: mode === 'light' ? '3px solid #000000' : '3px solid #FFFFFF',
                boxShadow: mode === 'light' ? '6px 6px 0px #000000' : '6px 6px 0px #FFD700',
                backgroundColor: mode === 'light' ? '#FFFFFF' : '#111821',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 0,
                border: mode === 'light' ? '3px solid #000000' : '3px solid #FFFFFF',
                boxShadow: mode === 'light' ? '4px 4px 0px #000000' : '4px 4px 0px #FFD700',
              },
              elevation0: { boxShadow: 'none', border: 'none' },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#FFFFFF' : '#111821',
                color: mode === 'light' ? '#000000' : '#FFFFFF',
                borderBottom: mode === 'light' ? '3px solid #000000' : '3px solid #FFFFFF',
                boxShadow: mode === 'light' ? '0px 4px 0px #000000' : '0px 4px 0px #FFD700',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: mode === 'light' ? '3px solid #000000' : '3px solid #FFFFFF',
                boxShadow: mode === 'light' ? '4px 0px 0px #000000' : '4px 0px 0px #FFD700',
                backgroundColor: mode === 'light' ? '#FFFFFF' : '#111821',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};
