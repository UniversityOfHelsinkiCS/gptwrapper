/* eslint-disable */
import React, { useState } from 'react'
import Image from 'next/image'
import { enqueueSnackbar } from 'notistack'

import hyLogo from '../public/university_of_helsinki_logo.png'
import App from './_app'
import getCompletion from '../services/completion'

const HomePage = () => {
  const [system, setGuide] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const onSend = async () => {
    setLoading(true)

    try {
      const completion = await getCompletion(system, question)
      const answer: string = completion.choices[0].message.content.trim()

      setAnswer(answer)
    } catch (e: any) {
      const message = e?.response?.data || e.message
      enqueueSnackbar(message, { variant: 'error' })
    }

    setLoading(false)
  }

  return (
    <div className="App">
      <section className="hero is-light">
        <div className="hero-body">
          <div className="container">
            <div className="columns is-vcentered is-centered">
              <div className="column is-narrow">
                <div className="column has-text-centered has-text-centered-mobile">
                  <Image
                    style={{
                      maxHeight: '120px',
                      height: '100%',
                      width: 'auto',
                    }}
                    src={hyLogo}
                    alt="University of Helsinki Logo"
                  />
                  <div className="column has-text-right">
                    <div className="column has-text-centered has-text-centered-mobile">
                      <h1 className="title is-2 is-size-4-mobile">
                        GPT Wrapper
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-8-desktop">
              <div className="field">
                <label className="label" htmlFor="guide">
                  Guide to Answer
                </label>
                <textarea
                  className="textarea"
                  id="guide"
                  rows={2}
                  placeholder="Enter the guide here..."
                  onChange={(e: any) => setGuide(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="question">
                  Question
                </label>
                <textarea
                  className="textarea"
                  id="question"
                  rows={2}
                  placeholder="Enter the question here..."
                  onChange={(e:any) => setQuestion(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="answer">
                  Answer
                </label>
                <textarea className="textarea" id="answer" rows={10} readOnly defaultValue={answer} />
              </div>
              <div className="field is-grouped is-grouped-centered">
                <p className="control">
                  <button
                    className="button is-success"
                    id="send-button"
                    onClick={onSend}
                    disabled={loading}
                  >
                    Send
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default () => <App Component={HomePage} pageProps={{}} />
