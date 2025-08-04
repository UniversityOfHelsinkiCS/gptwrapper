import { GlobalStyles } from '@mui/material'

/* Quick scrollbar design using https://scrollbar.app/

body {
  --sb-track-color: #e0e0e0;
  --sb-thumb-color: #000000;
  --sb-size: 6px;
}

body::-webkit-scrollbar {
  width: var(--sb-size)
}

body::-webkit-scrollbar-track {
  background: var(--sb-track-color);
  border-radius: 3px;
}

body::-webkit-scrollbar-thumb {
  background: var(--sb-thumb-color);
  border-radius: 3px;

}

@supports not selector(::-webkit-scrollbar) {
  body {
    scrollbar-color: var(--sb-thumb-color)
                     var(--sb-track-color);
  }
}

*/

export default function Styles() {
  return (
    <GlobalStyles
      styles={{
        body: {
          '--sb-track-color': 'transparent',
          '--sb-thumb-color': '#000000',
          '--sb-thumb-hover-color': '#333333',
          '--sb-size': '6px',
        },
        '*::-webkit-scrollbar': {
          width: 'var(--sb-size)',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--sb-thumb-color)',
          borderRadius: 'var(--sb-size)',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'var(--sb-thumb-hover-color)',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'var(--sb-track-color)',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--sb-thumb-color) var(--sb-track-color)',
        },
      }}
    />
  )
}
