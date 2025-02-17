import {printMethod} from '../runner/text'
import {
  exec,
  insert,
  computeFn,
  union,
  value,
  matcher,
  computeVariant,
  computeVariants,
} from '../runner/declarator'

const grouping = {
  getHash: ({getHash}: any) => getHash,
  describeGroup: ({describeGroup}: any) => describeGroup,
  createTestLines: ({createTestLines}: any) => createTestLines,
  sortByFields: {
    targetToken: ['no target', 'unit target', 'tuple target'],
    typedFn: [false, true],
    source: ['event', 'store', 'combinable'],
    clock: ['none', 'event', 'store', 'tuple'],
    fn: ['none', 'noArgs', 'arg', 'argPair'],
    methodCode: 'string',
  },
}
const shapeNew = exec(() => {
  const source = union(['event', 'store', 'combinable'], 'source')
  const clock = union(['none', 'event', 'store', 'tuple'], 'clock')
  const target = union(['none', 'event', 'store', 'tuple'], 'target')
  const fn = insert<string>('fn', {
    split: {
      match: matcher(
        {clock},
        {
          noClock: {
            clock: 'none',
          },
        },
      ),
      cases: exec(() => {
        union(['none', 'noArgs', 'arg'], 'noClock')
        union(['none', 'noArgs', 'arg', 'argPair'], '__')
      }),
    },
  })
  const typedFn = insert<boolean>('typedFn', {
    split: {
      match: matcher(
        {fn},
        {
          hasFnArgs: [{fn: 'arg'}, {fn: 'argPair'}],
        },
      ),
      cases: exec(() => {
        insert<boolean>('hasFnArgs', {flag: {}})
        value(false, '__')
      }),
    },
  })

  const pass = value(true, 'pass')
  const typedFnToken = computeVariant({
    source: {typedFn},
    variant: {
      typed: {typedFn: true},
      untyped: {},
    },
    cases: {
      typed: ', typed fn',
      untyped: '',
    },
  })

  const targetToken = computeVariant({
    name: 'targetToken',
    source: {target},
    variant: {
      unit: [{target: 'event'}, {target: 'store'}],
      none: {target: 'none'},
      tuple: {target: 'tuple'},
    },
    cases: {
      unit: 'unit target',
      none: 'no target',
      tuple: 'tuple target',
    },
  })

  const methodCode = computeFn({
    name: 'methodCode',
    source: {
      pass,
      sourceCode: computeVariant({
        source: {source},
        variant: {
          event: {source: 'event'},
          store: {source: 'store'},
          combinable: {source: 'combinable'},
        },
        cases: {
          event: 'aNum    ',
          store: 'a       ',
          combinable: '{a:$num}',
        },
      }),
      clockCode: computeVariant({
        source: {clock},
        variant: {
          none: {clock: 'none'},
          event: {clock: 'event'},
          store: {clock: 'store'},
          tuple: {clock: 'tuple'},
        },
        cases: {
          none: null,
          event: 'num',
          store: '$num',
          tuple: '[num,$num]',
        },
      }),
      targetCode: computeVariant({
        source: {target},
        variant: {
          none: {target: 'none'},
          event: {target: 'event'},
          store: {target: 'store'},
          tuple: {target: 'tuple'},
        },
        cases: {
          none: null,
          event: 'aNumT',
          store: 'aT   ',
          tuple: '[aNumT,aT]',
        },
      }),
      fnCode: computeVariants({
        source: {fn, typedFn},
        variant: {
          fn: {
            none: {fn: 'none'},
            noArgs: {fn: 'noArgs'},
            arg: {fn: 'arg'},
            argPair: {fn: 'argPair'},
          },
          types: {
            typed: {typedFn: true},
            untyped: {typedFn: false},
          },
        },
        cases: {
          none: null,
          noArgs: 'fn0',
          arg: {
            typed: 'fn1',
            untyped: '({a}) => ({a})',
          },
          argPair: {
            typed: 'fn2',
            untyped: '({a},c) => ({a:a+c})',
          },
        },
      }),
    },
    fn: value => {
      return printMethod({
        method: 'sample',
        shape: {
          source: 'sourceCode',
          clock: 'clockCode',
          target: 'targetCode',
          fn: 'fnCode',
        },
        value,
        addExpectError: false,
      })
    },
  })
  const largeGroup = computeFn({
    name: 'largeGroup',
    source: [typedFnToken, targetToken],
    fn: ([typedFnToken, targetToken]) => `${targetToken}${typedFnToken}`,
  })
  const describeGroup = computeFn({
    name: 'describeGroup',
    source: [targetToken, typedFnToken, clock, largeGroup],
    fn: ([targetToken, typedFnToken, clock, largeGroup]) => ({
      largeGroup,
      noGroup: true,
      description: `${targetToken}${typedFnToken}, ${clock} clock`,
    }),
  })
  const getHash = computeFn({
    name: 'getHash',
    source: [targetToken, clock, typedFn],
    fn: ([targetToken, clock, typedFn]) => `${targetToken} ${clock} ${typedFn}`,
  })
  const createTestLines = computeFn({
    name: 'createTestLines',
    source: {
      methodCode,
      pass,
      returnCode: computeVariants({
        source: {target, source, clock},
        variant: {
          Target: {
            none: {target: 'none'},
            event: {target: 'event'},
            store: {target: 'store'},
            tuple: {target: 'tuple'},
          },
          sources: {
            store: [
              {source: 'store', clock: 'store'},
              {source: 'combinable', clock: 'store'},
              {source: 'store', clock: 'none'},
              {source: 'combinable', clock: 'none'},
            ],
            event: {},
          },
        },
        cases: {
          none: {
            store: 'Store<AN>',
            event: 'Event<AN>',
          },
          event: 'Event<AN>',
          store: 'Store<AN>',
          tuple: '[Event<AN>, Store<AN>]',
        },
      }),
    },
    fn: ({methodCode, pass, returnCode}) => [
      !pass && '//@ts-expect-error',
      `{const result: ${returnCode} = ${methodCode}}`,
    ],
  })
})

const shape = shapeNew

const header = `
type AN = {a: number}
const $num = createStore(0)
const a = createStore({a: 0})
const num = createEvent<number>()
const aNum = createEvent<AN>()
const aT = createStore({a: 0})
const aNumT = createEvent<AN>()
const fn0 = () => ({a: 0})
const fn1 = ({a}: AN) => ({a})
const fn2 = ({a}: AN, c: number) => ({a: a + c})
`

export default {shape, grouping, header}
