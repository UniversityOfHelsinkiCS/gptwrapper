import { Theme } from '@mui/material/styles'

const cardStyles = {
  card: {
    m: 2,
    transition: '0.3s',
    textAlign: 'left',
  },
  helloBox: {
    m: 2,
    maxWidth: 1560,
  },
  expendableBox: {
    my: 2,
    mx: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.3,
  },
  outerBox: {
    m: 2,
    maxWidth: 1560,
    border: 1,
    borderColor: 'grey.300',
  },
  gridBox: {
    px: 3,
    py: 2,
  },
  gridContainer: {
    spacing: 1,
  },
  questionsContainer: {
    my: 8,
    borderLeft: 1,
    borderColor: 'grey.300',
  },
  content: {
    mt: 2,
    mb: 2,
    pl: 2,
    textAlign: 'left',
  },
  question: {
    my: 2,
    fontWeight: '200',
  },
  heading: {
    fontWeight: '200',
    pb: 1,
  },
  subHeading: {
    fontWeight: '200',
    mt: 8,
    mx: 4,
    mb: 2,
    pl: 2,
    textAlign: 'left',
  },
  nestedSubSection: {
    fontWeight: '200',
    mt: 8,
    mx: 4,
    mb: 2,
    textAlign: 'left',
  },
  inputField: {
    mt: 2,
    width: 400,
  },
  answerBox: {
    my: 4,
    maxWidth: 1560,
    border: 1,
    borderColor: 'grey.300',
  },
}

const formStyles = {
  formWrapper: {
    my: 2,
    maxWidth: 1560,
  },
  formControl: {
    width: '100%',
  },
  contactForm: {
    width: '70vw',
    height: '80vh',
  },
  choiceBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.3,
  },
  stackBox: { textAlign: 'center' },
  stackBoxWrapper: {
    my: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stack: {
    textAlign: 'center',
  },
  stackButton: {
    mx: 2,
  },
}

const navStyles = {
  appbar: {
    zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    borderRadius: 0,
    borderBottom: '1px solid black',
    py: '1rem',
  },
  toolbar: {
    display: 'flex',
    width: '100%',
    '@media print': {
      display: 'none',
    },
    justifyContent: 'space-between',
    padding: '0.2rem 0 0.2rem 0',
  },
  appName: {
    textTransform: 'uppercase',
    color: 'black',
    fontWeight: 700,
    fontSize: 24,
    userSelect: 'none',
  },
  navBox: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'inherit',
    textDecoration: 'none',
    marginRight: 1,
    fontWeight: (theme: Theme) => theme.typography.fontWeightMedium,
    padding: '5px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0)',
    transition: 'background-color 0.1s',
    borderRadius: 3,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
  },
  icon: { mr: 1 },
  language: { mr: 1 },
  item: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  activeItem: {
    color: (theme: Theme) => theme.palette.primary.main,
    fontWeight: (theme: Theme) => theme.typography.fontWeightMedium,
  },
}

const recommendationStyles = {
  recommendationContainer: {
    position: 'sticky',
    top: '1rem',
    borderLeft: 1,
    paddingLeft: '1rem',
    marginLeft: '0.5rem',
    borderColor: 'grey.300',
    textAlign: 'left',
  },
  recommendationBox: {
    mt: '1.8rem',
  },
  recommendationChipWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  subtoolWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: 300,
  },
  subtoolItem: {
    ml: 1,
  },
  recommendationChipsContainer: {
    mx: '0.6rem',
  },
  notSelected: {
    fontWeight: 'light',
    color: '#9e9e9e',
  },
  subtoolText: {
    textTransform: 'capitalize',
    paddingLeft: '1rem',
    fontWeight: 'light',
    color: '#757575',
  },
}

const resultStyles = {
  card: {
    m: 2,
    transition: '0.3s',
    textAlign: 'left',
  },
  resultElementWrapper: {
    my: 4,
    borderLeft: 1,
    borderColor: 'grey.400',
  },
  resultElementContent: {
    mt: 2,
    mb: 1,
    pl: 2,
    textAlign: 'left',
  },
  resultWrapper: {
    m: 2,
  },
  heading: {
    fontWeight: '200',
    textAlign: 'left',
  },
}

const footerStyles = {
  supportBox: {
    py: '2rem',
    px: '3rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '1rem',
  },
}

const common = {
  alertStyle: {
    width: 'auto',
  },
}

export default {
  cardStyles,
  formStyles,
  common,
  navStyles,
  recommendationStyles,
  footerStyles,
  resultStyles,
}
