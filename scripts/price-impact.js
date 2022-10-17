currentBlock = block.number
lastExpiryBlock = currentBlock - (currentBlock % 5)
orderExpiry = 5 * (blockValue + 1) + lastExpiryBlock
sellingRate = amountIn / (orderExpiry - currentBlock)

orderPoolReserveFrom = balanceFrom - reserveFrom

orderPoolReserveTo = balanceTo - reserveTo

amountToOut = ((997 / 1000) * (orderPoolReserveFrom + sellingRate) * balanceTo) / (balanceFrom + sellingRate)

amountFromOut = ((997 / 1000) * orderPoolReserveTo * (balanceFrom + sellingRate)) / balanceTo

reserveFromEnd = balanceFrom + sellingRate - amountFromOut

reserveToEnd = balanceTo - amountToOut

priceImpact = 1 - (reserveFrom / reserveTo) * (reserveToEnd / reserveFromEnd)

// reserveFrom + sellingRateFrom + sellingRate

// reserveTo + sellingRateTo

// amountToOut =
//   ((997 / 1000) * (sellingRateFrom + sellingRate) * (reserveTo + sellingRateTo)) / (reserveFrom + sellingRateFrom + sellingRate)

// amountFromOut =
//   ((997 / 1000) * sellingRateTo * (reserveFrom + sellingRateFrom + sellingRate)) / (reserveTo + sellingRateTo)

// reserveFromEnd = reserveFrom + sellingRateFrom + sellingRate - amountFromOut

// reserveToEnd = reserveTo + sellingRateTo - amountToOut

// priceImpact = 1 - (reserveFrom / reserveTo) * (reserveToEnd / reserveFromEnd)
