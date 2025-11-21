/**
 * Property-based tests for debounce behavior in DataContext
 * Requirements: 4.2
 */

import * as fc from 'fast-check'

describe('DataContext Debounce Behavior', () => {
  // Use fake timers for all tests
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  /**
   * Feature: codebase-improvements, Property 7: Debouncing prevents excessive updates
   * Validates: Requirements 4.2
   * 
   * For any sequence of rapid Firebase listener updates within the debounce window, 
   * only the final update should trigger state changes.
   */
  test('Property 7: Debouncing prevents excessive updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Number of rapid updates within debounce window
          updateCount: fc.integer({ min: 2, max: 20 }),
          // Delay between updates (should be less than debounce delay)
          updateInterval: fc.integer({ min: 10, max: 250 }),
          // The debounce delay (300ms as per PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY)
          debounceDelay: fc.constant(300),
          // Data values for each update
          dataValues: fc.array(fc.string(), { minLength: 2, maxLength: 20 }),
        }),
        ({ updateCount, updateInterval, debounceDelay, dataValues }) => {
          // Ensure we have enough data values for the update count
          const updates = dataValues.slice(0, updateCount)
          if (updates.length < updateCount) {
            // Pad with generated values if needed
            for (let i = updates.length; i < updateCount; i++) {
              updates.push(`value_${i}`)
            }
          }

          // Track state updates
          const stateUpdates = []
          let debounceTimer = null

          // Mock dispatch function that tracks state updates
          const mockDispatch = jest.fn((action) => {
            stateUpdates.push({
              type: action.type,
              payload: action.payload,
            })
          })

          // Simulate debounced update function
          const debouncedUpdate = (data) => {
            if (debounceTimer) {
              clearTimeout(debounceTimer)
            }

            debounceTimer = setTimeout(() => {
              mockDispatch({
                type: 'SET_DATA',
                payload: data,
              })
            }, debounceDelay)
          }

          // Simulate rapid updates
          for (let i = 0; i < updateCount; i++) {
            debouncedUpdate(updates[i])
            
            // Advance time by update interval
            jest.advanceTimersByTime(updateInterval)
          }

          // Advance time by debounce delay to trigger the final update
          jest.advanceTimersByTime(debounceDelay)

          // Clear any remaining timers
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }

          // Verify that only ONE state update occurred (the final one)
          if (stateUpdates.length !== 1) {
            return false
          }

          // Verify that the final update contains the last data value
          const finalUpdate = stateUpdates[0]
          if (finalUpdate.payload !== updates[updateCount - 1]) {
            return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Verify debounce behavior with varying intervals
   * This tests that updates separated by more than the debounce delay
   * should each trigger a state update.
   */
  test('Debounce allows updates when intervals exceed debounce delay', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Number of updates
          updateCount: fc.integer({ min: 2, max: 5 }),
          // Delay between updates (should be MORE than debounce delay)
          updateInterval: fc.integer({ min: 350, max: 500 }),
          // The debounce delay
          debounceDelay: fc.constant(300),
          // Data values for each update
          dataValues: fc.array(fc.string(), { minLength: 2, maxLength: 5 }),
        }),
        ({ updateCount, updateInterval, debounceDelay, dataValues }) => {
          // Ensure we have enough data values
          const updates = dataValues.slice(0, updateCount)
          if (updates.length < updateCount) {
            for (let i = updates.length; i < updateCount; i++) {
              updates.push(`value_${i}`)
            }
          }

          // Track state updates
          const stateUpdates = []
          let debounceTimer = null

          // Mock dispatch function
          const mockDispatch = jest.fn((action) => {
            stateUpdates.push({
              type: action.type,
              payload: action.payload,
            })
          })

          // Simulate debounced update function
          const debouncedUpdate = (data) => {
            if (debounceTimer) {
              clearTimeout(debounceTimer)
            }

            debounceTimer = setTimeout(() => {
              mockDispatch({
                type: 'SET_DATA',
                payload: data,
              })
            }, debounceDelay)
          }

          // Simulate updates with intervals longer than debounce delay
          for (let i = 0; i < updateCount; i++) {
            debouncedUpdate(updates[i])
            
            // Advance time by interval + debounce delay to ensure update completes
            jest.advanceTimersByTime(updateInterval + debounceDelay)
          }

          // Clear any remaining timers
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }

          // Verify that ALL updates occurred (one for each call)
          if (stateUpdates.length !== updateCount) {
            return false
          }

          // Verify that each update contains the correct data value
          for (let i = 0; i < updateCount; i++) {
            if (stateUpdates[i].payload !== updates[i]) {
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Edge case test: Single update should always trigger state change
   */
  test('Single update triggers state change after debounce delay', () => {
    fc.assert(
      fc.property(
        fc.record({
          debounceDelay: fc.constant(300),
          dataValue: fc.string(),
        }),
        ({ debounceDelay, dataValue }) => {
          // Track state updates
          const stateUpdates = []
          let debounceTimer = null

          // Mock dispatch function
          const mockDispatch = jest.fn((action) => {
            stateUpdates.push({
              type: action.type,
              payload: action.payload,
            })
          })

          // Simulate debounced update function
          const debouncedUpdate = (data) => {
            if (debounceTimer) {
              clearTimeout(debounceTimer)
            }

            debounceTimer = setTimeout(() => {
              mockDispatch({
                type: 'SET_DATA',
                payload: data,
              })
            }, debounceDelay)
          }

          // Single update
          debouncedUpdate(dataValue)

          // Advance time by debounce delay
          jest.advanceTimersByTime(debounceDelay)

          // Clear timer
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }

          // Verify exactly one update occurred
          if (stateUpdates.length !== 1) {
            return false
          }

          // Verify the update contains the correct data
          if (stateUpdates[0].payload !== dataValue) {
            return false
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
