import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default function extension() {
  render(<App />, document.body);
}

function App() {
  const {applyCartLinesChange, query, i18n} = shopify;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [purchase, setPurchase] = useState('one-time');
  const [sellingPlanId, setSellingPlanId] = useState('');
  const lines = shopify.lines.value;
  const {title: merchantTitle, variant_id: variantIdSetting} =
    shopify.settings.value ?? {};
  const heading = merchantTitle ?? 'You might also like';
  const variantId = variantIdSetting ?? '';
  const country = shopify.localization.country.value?.isoCode ?? 'US';

  useEffect(() => {
    fetchProducts();
  }, [variantId, country]);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  function handleVariants(id) {
    setSelectedVariantId(id);
  }

  function switchPurchase(value, planId) {
    const id = value === 'subscribe' ? planId : '';
    setSellingPlanId(id);
    setPurchase(value);
  }

  function selectedPurchaseOption(value) {
    setSellingPlanId(value);
  }

  async function handleAddToCart() {
    setAdding(true);
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: selectedVariantId,
      quantity: 1,
      ...(sellingPlanId && {sellingPlanId}),
    });
    setAdding(false);
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    if (!variantId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const {data} = /** @type {{data?: {node?: {product?: any}}}} */ (
        await query(
          `query ($id: ID!, $country: CountryCode!) @inContext(country: $country) {
          node(id: $id) {
            ... on ProductVariant {
              id
              product {
                id
                title
                sellingPlanGroups(first: 10) {
                  edges {
                    node {
                      name
                      sellingPlans(first: 10) {
                        nodes {
                          name
                          id
                          priceAdjustments {
                            adjustmentValue {
                              ... on SellingPlanPercentagePriceAdjustment {
                                adjustmentPercentage
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                images(first: 1) {
                  nodes {
                    url
                  }
                }
                variants(first: 20) {
                  nodes {
                    id
                    title
                    availableForSale
                    price {
                      amount
                    }
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          variables: {
            id: variantId,
            country,
          },
        },
        )
      );
      const product = data?.node?.product;
      setProducts(product ? [product] : []);
      const availableVariant = product?.variants?.nodes?.find(
        (variant) => variant.availableForSale,
      );
      if (availableVariant) {
        setSelectedVariantId(availableVariant.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton heading={heading} />;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(lines, products);

  if (!productsOnOffer.length) {
    return null;
  }

  return (
    <ProductOffer
      products={productsOnOffer}
      i18n={i18n}
      adding={adding}
      handleAddToCart={handleAddToCart}
      handleVariants={handleVariants}
      showError={showError}
      heading={heading}
      selectedVariantId={selectedVariantId}
      switchPurchase={switchPurchase}
      purchase={purchase}
      selectedPurchaseOption={selectedPurchaseOption}
      sellingPlanId={sellingPlanId}
    />
  );
}

function LoadingSkeleton({heading}) {
  return (
    <s-stack gap="large-200">
      <s-divider />
      <s-heading>{heading}</s-heading>
      <s-stack gap="large-200">
        <s-grid
          gap="base"
          gridTemplateColumns="64px 1fr auto"
          alignItems="center"
        >
          <s-image aspectRatio="1" alt="" />
          <s-stack gap="none">
            <s-skeleton-paragraph />
            <s-skeleton-paragraph />
          </s-stack>
          <s-button variant="secondary" disabled>
            Add
          </s-button>
        </s-grid>
      </s-stack>
    </s-stack>
  );
}

function getProductsOnOffer(lines, products) {
  const cartLineProductVariantIds = lines.map((item) => item.merchandise.id);
  return products
    .filter((product) => product?.variants?.nodes)
    .filter((product) => {
      const isProductVariantInCart = product.variants.nodes.some(({id}) =>
        cartLineProductVariantIds.includes(id),
      );
      return !isProductVariantInCart;
    })
    .slice(0, 3);
}

function ProductOffer({
  products,
  i18n,
  adding,
  handleAddToCart,
  showError,
  heading,
  handleVariants,
  selectedVariantId,
  switchPurchase,
  purchase,
  selectedPurchaseOption,
  sellingPlanId,
}) {
  const imageUrl =
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';
  const getVariant = products[0]?.variants?.nodes?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const sellingPlanGroups = products[0]?.sellingPlanGroups?.edges[0]?.node;
  const sellingPlans = sellingPlanGroups?.sellingPlans?.nodes;
  const adjustmentValue = 10;
  const imageSrc = getVariant?.image?.url ?? imageUrl;
  const price = getVariant?.price?.amount
    ? i18n.formatCurrency(getVariant.price.amount)
    : '';

  return (
    <s-stack gap="large-200">
      <s-divider />
      <s-heading>{heading}</s-heading>
      {products.map((product) => (
        <s-stack gap="large-200" key={product.id}>
          <s-grid
            gap="base"
            gridTemplateColumns="100px 1fr auto"
            alignItems="center"
          >
            <s-image
              border="base"
              borderWidth="base"
              borderRadius="large"
              src={imageSrc}
              alt={product.title}
              aspectRatio="1"
            />
            <s-stack gap="none">
              <s-text type="strong">{product.title}</s-text>
              <s-text color="subdued">{price}</s-text>
              <s-stack gap="base">
                {product?.variants?.nodes?.length > 1 && (
                  <s-choice-list
                    name="variant"
                    variant="grid"
                    onChange={(event) => handleVariants(choiceListValue(event))}
                  >
                    {product.variants.nodes.map((variant) => (
                      <s-choice
                        key={variant.id}
                        value={variant.id}
                        selected={selectedVariantId === variant.id}
                        disabled={!variant.availableForSale}
                      >
                        {variant.title}
                      </s-choice>
                    ))}
                  </s-choice-list>
                )}
                {sellingPlans?.length ? (
                  <s-stack gap="base">
                    <s-choice-list
                      name="purchase"
                      onChange={(event) =>
                        switchPurchase(choiceListValue(event), sellingPlans[0].id)
                      }
                    >
                      <s-choice
                        value="one-time"
                        selected={purchase === 'one-time'}
                      >
                        One-time purchase
                      </s-choice>
                      <s-choice
                        value="subscribe"
                        selected={purchase === 'subscribe'}
                      >
                        Subscribe & save {adjustmentValue}%
                      </s-choice>
                    </s-choice-list>
                    {purchase === 'subscribe' && (
                      <s-select
                        label="Purchase options"
                        value={sellingPlanId}
                        onChange={(event) =>
                          selectedPurchaseOption(selectValue(event))
                        }
                      >
                        {sellingPlans.map((option) => (
                          <s-option key={option.id} value={option.id}>
                            {option.name}
                          </s-option>
                        ))}
                      </s-select>
                    )}
                  </s-stack>
                ) : null}
              </s-stack>
            </s-stack>
            <s-button
              variant="secondary"
              loading={adding}
              accessibilityLabel={`Add ${product.title} to cart`}
              onClick={() => handleAddToCart()}
            >
              Add
            </s-button>
          </s-grid>
        </s-stack>
      ))}
      {showError && <ErrorBanner />}
    </s-stack>
  );
}

function choiceListValue(event) {
  const target = event.currentTarget;
  if (target && 'values' in target && Array.isArray(target.values)) {
    return target.values[0] ?? '';
  }
  return '';
}

function selectValue(event) {
  const target = event.currentTarget;
  if (target && 'value' in target && typeof target.value === 'string') {
    return target.value;
  }
  return '';
}

function ErrorBanner() {
  return (
    <s-banner tone="critical">
      There was an issue adding this product. Please try again.
    </s-banner>
  );
}
