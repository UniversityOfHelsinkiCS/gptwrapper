import { createContext, type ReactNode, useContext, useReducer } from 'react'
import type { FeedbackMetadata } from '../../shared/feedback'
import { getI18n } from 'react-i18next'

type AnalyticsAction =
  | {
      type: 'SET_ANALYTICS_DATA'
      payload: FeedbackMetadata
    }
  | {
      type: 'RESET_CHAT'
    }
  | {
      type: 'INCREMENT_FILE_SEARCHES'
    }

const initialFeedbackMetadata: FeedbackMetadata = {}

function analyticsReducer(state: FeedbackMetadata, action: AnalyticsAction): FeedbackMetadata {
  switch (action.type) {
    case 'SET_ANALYTICS_DATA':
      return {
        ...state,
        ...action.payload,
      }
    case 'RESET_CHAT':
      return {
        ...state,
        fileSearchesMade: undefined,
        nMessages: undefined,
      }
    case 'INCREMENT_FILE_SEARCHES':
      return {
        ...state,
        fileSearchesMade: state.fileSearchesMade ? state.fileSearchesMade + 1 : 1,
      }
    default:
      return state
  }
}

const AnalyticsContext = createContext<FeedbackMetadata | undefined>(undefined)
const AnalyticsDispatchContext = createContext<React.Dispatch<AnalyticsAction> | undefined>(undefined)

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(analyticsReducer, initialFeedbackMetadata)

  return (
    <AnalyticsContext.Provider value={state}>
      <AnalyticsDispatchContext.Provider value={dispatch}>{children}</AnalyticsDispatchContext.Provider>
    </AnalyticsContext.Provider>
  )
}

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

export const useAnalyticsDispatch = () => {
  const context = useContext(AnalyticsDispatchContext)
  if (context === undefined) {
    throw new Error('useAnalyticsDispatch must be used within an AnalyticsProvider')
  }
  return context
}

const getUserAgentData = () => {
  /* @ts-expect-error not supported in all browsers */
  const uaData = navigator.userAgentData as Record<string, any> | undefined

  if (!uaData) {
    return {
      browser: navigator.userAgent,
      mobile: navigator.userAgent.includes('Mobile'),
      os: navigator.platform,
    }
  }

  return {
    browser: uaData.brands.map((b) => `${b.brand} ${b.version}`).join(', '),
    mobile: uaData.mobile,
    os: uaData.platform,
  }
}

export const addJustInTimeFields = (analytics: FeedbackMetadata): FeedbackMetadata => {
  return {
    ...analytics,
    url: window.location.href,
    language: getI18n().language,
    windowResolution: `${window.innerWidth}x${window.innerHeight}`,
    ...getUserAgentData(),
  }
}
