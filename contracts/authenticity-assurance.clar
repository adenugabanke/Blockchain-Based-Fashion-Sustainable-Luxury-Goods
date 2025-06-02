;; Authenticity Assurance Contract
;; Ensures luxury goods authenticity

(define-data-var admin principal tx-sender)

;; Map of authentic products
(define-map authentic-products
  { product-id: (string-ascii 64) }
  {
    brand-id: (string-ascii 64),
    creation-date: uint,
    serial-number: (string-ascii 64),
    authenticated: bool,
    current-owner: principal
  }
)

;; Function to register an authentic product
(define-public (register-product
                (product-id (string-ascii 64))
                (brand-id (string-ascii 64))
                (serial-number (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (asserts! (is-none (map-get? authentic-products { product-id: product-id })) (err u100))
    (ok (map-set authentic-products
      { product-id: product-id }
      {
        brand-id: brand-id,
        creation-date: block-height,
        serial-number: serial-number,
        authenticated: true,
        current-owner: tx-sender
      }
    ))
  )
)

;; Function to transfer ownership of a product
(define-public (transfer-ownership (product-id (string-ascii 64)) (new-owner principal))
  (begin
    (match (map-get? authentic-products { product-id: product-id })
      product-data
        (begin
          (asserts! (is-eq tx-sender (get current-owner product-data)) (err u403))
          (ok (map-set authentic-products
            { product-id: product-id }
            (merge product-data { current-owner: new-owner })
          ))
        )
      (err u404)
    )
  )
)

;; Function to verify product authenticity
(define-read-only (verify-authenticity (product-id (string-ascii 64)) (serial-number (string-ascii 64)))
  (match (map-get? authentic-products { product-id: product-id })
    product-data
      (ok (and
        (get authenticated product-data)
        (is-eq serial-number (get serial-number product-data))
      ))
    (err u404)
  )
)

;; Function to revoke authenticity (for counterfeit products)
(define-public (revoke-authenticity (product-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? authentic-products { product-id: product-id })
      product-data
        (ok (map-set authentic-products
          { product-id: product-id }
          (merge product-data { authenticated: false })
        ))
      (err u404)
    )
  )
)
