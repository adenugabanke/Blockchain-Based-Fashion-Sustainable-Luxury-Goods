import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
let mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOtherUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
const mockCustomer = "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0"

// Mock contract state
let mockAuthenticProducts = {}
let mockAdmin = mockTxSender
let mockBlockHeight = 100

// Mock contract functions
const mockContract = {
  "register-product": (productId, brandId, serialNumber) => {
    if (mockTxSender !== mockAdmin) {
      return { err: 403 }
    }
    
    if (mockAuthenticProducts[productId]) {
      return { err: 100 }
    }
    
    mockAuthenticProducts[productId] = {
      "brand-id": brandId,
      "creation-date": mockBlockHeight,
      "serial-number": serialNumber,
      authenticated: true,
      "current-owner": mockTxSender,
    }
    
    return { ok: true }
  },
  
  "transfer-ownership": (productId, newOwner) => {
    if (!mockAuthenticProducts[productId]) {
      return { err: 404 }
    }
    
    if (mockTxSender !== mockAuthenticProducts[productId]["current-owner"]) {
      return { err: 403 }
    }
    
    mockAuthenticProducts[productId]["current-owner"] = newOwner
    return { ok: true }
  },
  
  "verify-authenticity": (productId, serialNumber) => {
    if (!mockAuthenticProducts[productId]) {
      return { err: 404 }
    }
    
    const isAuthentic =
        mockAuthenticProducts[productId]["authenticated"] &&
        mockAuthenticProducts[productId]["serial-number"] === serialNumber
    
    return { ok: isAuthentic }
  },
  
  "revoke-authenticity": (productId) => {
    if (mockTxSender !== mockAdmin) {
      return { err: 403 }
    }
    
    if (!mockAuthenticProducts[productId]) {
      return { err: 404 }
    }
    
    mockAuthenticProducts[productId]["authenticated"] = false
    return { ok: true }
  },
}

describe("Authenticity Assurance Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockAuthenticProducts = {}
    mockAdmin = mockTxSender
    mockBlockHeight = 100
  })
  
  it("should register an authentic product", () => {
    const result = mockContract["register-product"]("luxury-bag-001", "gucci-123", "SN12345678")
    expect(result).toEqual({ ok: true })
    expect(mockAuthenticProducts["luxury-bag-001"]).toBeDefined()
    expect(mockAuthenticProducts["luxury-bag-001"]["brand-id"]).toBe("gucci-123")
    expect(mockAuthenticProducts["luxury-bag-001"]["serial-number"]).toBe("SN12345678")
    expect(mockAuthenticProducts["luxury-bag-001"]["authenticated"]).toBe(true)
  })
  
  it("should not allow non-admin to register a product", () => {
    mockTxSender = mockOtherUser
    const result = mockContract["register-product"]("luxury-watch-002", "rolex-456", "SN87654321")
    expect(result).toEqual({ err: 403 })
    expect(mockAuthenticProducts["luxury-watch-002"]).toBeUndefined()
  })
  
  it("should not allow duplicate product registration", () => {
    mockContract["register-product"]("luxury-scarf-003", "hermes-789", "SN11223344")
    const result = mockContract["register-product"]("luxury-scarf-003", "hermes-789", "SN11223344")
    expect(result).toEqual({ err: 100 })
  })
  
  it("should transfer ownership of a product", () => {
    mockContract["register-product"]("luxury-shoes-004", "louboutin-101", "SN44332211")
    const result = mockContract["transfer-ownership"]("luxury-shoes-004", mockCustomer)
    expect(result).toEqual({ ok: true })
    expect(mockAuthenticProducts["luxury-shoes-004"]["current-owner"]).toBe(mockCustomer)
  })

  it("should verify product authenticity correctly", () => {
    mockContract["register-product"]("luxury-wallet-006", "lv-303", "SN99887766")
    
    // Correct serial number
    const validResult = mockContract["verify-authenticity"]("luxury-wallet-006", "SN99887766")
    expect(validResult).toEqual({ ok: true })
    
    // Incorrect serial number
    const invalidResult = mockContract["verify-authenticity"]("luxury-wallet-006", "WRONG-SN")
    expect(invalidResult).toEqual({ ok: false })
  })
  
  it("should revoke authenticity for counterfeit products", () => {
    mockContract["register-product"]("luxury-sunglasses-007", "prada-404", "SN12312312")
    const result = mockContract["revoke-authenticity"]("luxury-sunglasses-007")
    expect(result).toEqual({ ok: true })
    expect(mockAuthenticProducts["luxury-sunglasses-007"]["authenticated"]).toBe(false)
    
    // Verify that the product is now marked as inauthentic
    const verifyResult = mockContract["verify-authenticity"]("luxury-sunglasses-007", "SN12312312")
    expect(verifyResult).toEqual({ ok: false })
  })
})

