// SpotPool event ABI for the Somnia DEX (DreamDEX).
// Source: somnia-dex-protocol — `src/spot/SpotPool.sol`. Only the event entries are kept
// here; the full ABI (including read/write functions) is not needed to decode logs.
export const spotPoolEventsAbi = [
  {
    type: "event",
    name: "OrderPlaced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      {
        name: "placedOrder",
        type: "tuple",
        indexed: false,
        components: [
          { name: "orderId", type: "uint128" },
          { name: "isBid", type: "bool" },
          { name: "owner", type: "address" },
          { name: "userData", type: "uint64" },
          { name: "price", type: "uint256" },
          { name: "fullQuantity", type: "uint256" },
          { name: "quantityRemaining", type: "uint256" },
          { name: "expireTimestampNs", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "OrderRested",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
  },
  {
    type: "event",
    name: "OrderCancelled",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
  },
  {
    type: "event",
    name: "OrderExpired",
    inputs: [{ name: "orderId", type: "uint128", indexed: true }],
  },
  {
    type: "event",
    name: "OrderReduced",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      { name: "newQuantity", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderFilled",
    inputs: [
      { name: "takerOrderId", type: "uint128", indexed: true },
      { name: "makerOrderId", type: "uint128", indexed: true },
      { name: "quantityFilled", type: "uint256", indexed: false },
      { name: "takerRemainingQuantity", type: "uint256", indexed: false },
      { name: "makerRemainingQuantity", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderBookParametersUpdated",
    inputs: [
      {
        name: "newParameters",
        type: "tuple",
        indexed: false,
        components: [
          { name: "tickSize", type: "uint256" },
          { name: "minQuantity", type: "uint256" },
          { name: "lotSize", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "MarkPriceUpdated",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "markPrice", type: "uint256", indexed: false },
      { name: "rawMidpoint", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FeeRecipientUpdated",
    inputs: [
      { name: "oldRecipient", type: "address", indexed: true },
      { name: "newRecipient", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "BuilderApproved",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "builder", type: "address", indexed: true },
      { name: "maxFeeBpsTimes1k", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BuilderFeeCharged",
    inputs: [
      { name: "orderId", type: "uint128", indexed: true },
      { name: "builder", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "MidpointEmaParametersUpdated", inputs: [] },
  { type: "event", name: "MidpointEmaReset", inputs: [] },
  {
    type: "event",
    name: "ContractApprovalUpdated",
    inputs: [
      { name: "contractAddress", type: "address", indexed: true },
      { name: "isApproved", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MaxBuilderFeeUpdated",
    inputs: [
      { name: "oldMax", type: "uint256", indexed: false },
      { name: "newMax", type: "uint256", indexed: false },
    ],
  },
] as const;
