import * as pull from 'pull-stream'
import { PushableDuplex } from '../src'
import { noop } from '../src/utils'
import { getProbe, valuesToRead } from './common'

describe('abort', () => {
  const abort = new Error('test error')
  it('test abort sink', (done) => {
    const results: any[] = []
    const onSourceEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBeNull()
    })
    const onSinkEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBe(abort)
      expect(results).toEqual([])
    })
    const onPeerSourceEnded = jest.fn((err: pull.EndOrError | undefined) => {
      expect(err).toBe(abort)
    })
    const onPeerSinkCollected = jest.fn((err: pull.EndOrError, results: number[]) => {
      expect(err).toBeNull()
      expect(results).toEqual([1, 2, 3])
    })
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: valuesToRead([1, 2, 3]),
      onReceived: (data) => {
        results.push(data)
      },
      onFinished: (err) => {
        expect(err).toBe(abort)
        expect(onSourceEnded).toBeCalled()
        expect(onSinkEnded).toBeCalled()
        expect(onPeerSourceEnded).toBeCalled()
        expect(onPeerSinkCollected).toBeCalled()
        done()
      },
      onSourceEnded: onSourceEnded,
      onSinkEnded: onSinkEnded,
    })
    const peer = {
      source: pull(
        pull.values(['a', 'b', 'c'], onPeerSourceEnded),
        pull.asyncMap((data, cb) => {
          setTimeout(() => {
            cb(null, data)
          }, 100)
        }),
        getProbe()
      ),
      sink: pull(getProbe(), pull.collect(onPeerSinkCollected)),
    }
    pull(d, peer, d)
    d.abortSink(abort)
    d.endSource()
  })
  it('test abort source', (done) => {
    const values = ['a', 'b', 'c']
    const results: any[] = []
    const onSourceEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBe(abort)
    })
    const onSinkEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBeNull()
      expect(results).toEqual(values)
    })
    const onPeerSourceEnded = jest.fn((err: pull.EndOrError | undefined) => {
      expect(err).toBeNull()
    })
    const onPeerSinkCollected = jest.fn((err: pull.EndOrError, results: number[]) => {
      expect(err).toBe(abort)
      expect(results).toEqual([])
    })
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: noop,
      onReceived: (data) => {
        results.push(data)
      },
      onFinished: (err) => {
        expect(err).toBe(abort)
        expect(onSourceEnded).toBeCalled()
        expect(onSinkEnded).toBeCalled()
        expect(onPeerSinkCollected).toBeCalled()
        done()
      },
      onSourceEnded: onSourceEnded,
      onSinkEnded: onSinkEnded,
    })
    const peer = {
      source: pull(
        pull.values(values, onPeerSourceEnded),
        pull.asyncMap((data, cb) => {
          setTimeout(() => {
            cb(null, data)
          }, 100)
        }),
        getProbe()
      ),
      sink: pull(getProbe(), pull.collect(onPeerSinkCollected)),
    }
    pull(d, peer, d)
    d.abortSource(abort)
  })
  it('test abort source by read', (done) => {
    const results: any[] = []
    const onSourceEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBe(abort)
    })
    const onSinkEnded = jest.fn((err: pull.EndOrError) => {
      expect(err).toBeNull()
      expect(results).toEqual(['a', 'b'])
    })
    const d = new PushableDuplex({
      allowHalfOpen: true,
      onRead: valuesToRead([1, 2, 3]),
      onReceived: (data) => {
        results.push(data)
      },
      onFinished: (err) => {
        expect(err).toBe(abort)
        expect(onSourceEnded).toBeCalled()
        expect(onSinkEnded).toBeCalled()
        done()
      },
      onSourceEnded: onSourceEnded,
      onSinkEnded: onSinkEnded,
    })
    pull(pull.values(['a', 'b']), getProbe(), d.sink)
    d.source(null, (e: pull.EndOrError, v: any) => {
      expect(e).toBeNull()
      expect(v).toEqual(1)
      d.source(abort, (e: pull.EndOrError, v: any) => {
        expect(e).toBe(abort)
        expect(v).toBeUndefined()
      })
    })
  })
})
