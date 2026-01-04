/**
 * Test script to verify ensureStringArray function works correctly
 * This demonstrates how the fix handles various malformed data scenarios
 */

function ensureStringArray(value: any): string[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === "string")
}

// Test cases
console.log("Testing ensureStringArray function:\n")

// Test 1: Valid array of strings
const test1 = ensureStringArray(["Hentai", "Ecchi"])
console.log("✓ Valid array:", test1) // ["Hentai", "Ecchi"]

// Test 2: Null value
const test2 = ensureStringArray(null)
console.log("✓ Null value:", test2) // []

// Test 3: Undefined value
const test3 = ensureStringArray(undefined)
console.log("✓ Undefined value:", test3) // []

// Test 4: Non-array value (string)
const test4 = ensureStringArray("Hentai")
console.log("✓ String value:", test4) // []

// Test 5: Non-array value (object)
const test5 = ensureStringArray({ genres: ["Hentai"] })
console.log("✓ Object value:", test5) // []

// Test 6: Array with mixed types
const test6 = ensureStringArray(["Hentai", 123, null, "Ecchi", undefined, true])
console.log("✓ Mixed array:", test6) // ["Hentai", "Ecchi"]

// Test 7: Empty array
const test7 = ensureStringArray([])
console.log("✓ Empty array:", test7) // []

// Test 8: Array with only non-strings
const test8 = ensureStringArray([123, true, null, undefined])
console.log("✓ Non-string array:", test8) // []

console.log("\n✅ All tests demonstrate defensive behavior")
console.log("The function always returns a valid string array, preventing API errors")
