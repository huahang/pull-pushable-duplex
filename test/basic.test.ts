import * as pull from 'pull-stream'
import { PushableDuplex } from '../src'
import { noop } from '../src/utils'
import { getProbe, valuesToRead } from './common'

describe('basic', () => {
  it('README', (done) => {
    const s1Values = [1, 2, 3]
    const s2Values = ['a', 'b', 'c']
    const results: any[] = []
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: valuesToRead(s1Values),
      onReceived: (data) => {
        results.push(data)
      },
      onFinished: (err) => {
        expect(err).toBeNull()
        expect(results).toEqual(s2Values)
        done()
      },
    })
    const peer = {
      source: pull(pull.values(s2Values), getProbe()),
      sink: pull(
        getProbe(),
        pull.collect((err, results) => {
          expect(err).toBeFalsy()
          expect(results).toEqual(s1Values)
        })
      ),
    }
    pull(d, peer, d)
  })
  it('test push', (done) => {
    const s1Values = [1, 2, 3]
    const s2Values = ['a', 'b', 'c']
    const results: any[] = []
    const onPeerSinkCollected = jest.fn((err: pull.EndOrError, results: number[]) => {
      expect(err).toBeFalsy()
      expect(results).toEqual(s1Values)
    })
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: noop,
      onReceived: (data) => {
        results.push(data)
      },
      onFinished: (err) => {
        expect(err).toBeNull()
        expect(onPeerSinkCollected).toBeCalled()
        expect(results).toEqual(s2Values)
        done()
      },
    })
    const peer = {
      source: pull(pull.values(s2Values), getProbe()),
      sink: pull(getProbe(), pull.collect(onPeerSinkCollected)),
    }
    d.push(1)
    d.push(2)
    d.push(3)
    pull(d, peer, d)
    d.end()
  })
  it('test read source manually', (done) => {
    const abort = new Error('test error')
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: valuesToRead([1, 2, 3]),
      onReceived: undefined,
      onFinished: (err) => {
        expect(err).toBe(abort)
        done()
      },
    })
    let source = getProbe()(d.source)
    source(null, (e: pull.EndOrError, v: any) => {
      expect(e).toBeNull()
      expect(v).toEqual(1)
      source(null, (e: pull.EndOrError, v: any) => {
        expect(e).toBeNull()
        expect(v).toEqual(2)
        source(abort, (e: pull.EndOrError, v: any) => {
          expect(e).toBe(abort)
          expect(v).toBeUndefined()
        })
      })
    })
  })
  it('test read pushed source manually', (done) => {
    const abort = new Error('test error')
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: undefined,
      onReceived: undefined,
      onFinished: (err) => {
        expect(err).toBe(abort)
        done()
      },
    })
    d.push(1)
    d.push(2)
    d.push(3)
    let source = getProbe()(d.source)
    source(null, (e: pull.EndOrError, v: any) => {
      expect(e).toBeNull()
      expect(v).toEqual(1)
      source(null, (e: pull.EndOrError, v: any) => {
        expect(e).toBeNull()
        expect(v).toEqual(2)
        source(abort, (e: pull.EndOrError, v: any) => {
          expect(e).toBe(abort)
          expect(v).toBeUndefined()
        })
      })
    })
  })
})
