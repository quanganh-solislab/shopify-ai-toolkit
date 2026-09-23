import React, { useEffect, useState } from 'react';
import {
  reactExtension,
  Divider,
  Image,
  Banner,
  Heading,
  Button,
  InlineLayout,
  BlockStack,
  Text,
  SkeletonText,
  SkeletonImage,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  useSettings,
  ToggleButtonGroup,
  ToggleButton,
  View,
  ChoiceList,
  Choice,
  Select
} from '@shopify/ui-extensions-react/checkout';
// Set up the entry point for the extension
export default reactExtension('purchase.checkout.block.render', () => <App />);

function App() {
  const { query, i18n, localization } = useApi();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const lines = useCartLines();
  const [purchase, setPurchase] = useState('one-time');
  const [sellingPlanId, setSellingPlanId] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  function handleVariants (id) {
    setSelectedVariantId(id)
  }

  function switchPurchase(value, sellingPlanId) {
    const id = value === 'subscribe' ? sellingPlanId : ''
    setSellingPlanId(id)
    setPurchase(value)
  }

  function selectedPurchaseOption (value) {
    setSellingPlanId(value)
  }

  async function handleAddToCart() {
    setAdding(true);
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: selectedVariantId,
      quantity: 1,
      ...(sellingPlanId && { sellingPlanId }),
    });
    setAdding(false);
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  const {title: merchantTitle, variant_id} = useSettings();
  const heading = merchantTitle ?? 'You might also like';
  const variantId = variant_id ?? ''
  const country = localization?.country?.current?.isoCode ?? 'US'
  
  async function fetchProducts() {
    setLoading(true);
    if (!variantId) {
      setLoading(false);
      return
    }
    try {
      const { data } = await query(
        `query ($id: ID!) @inContext(country: ${country}) {
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
          },
        }
      );
      setProducts([data?.node?.product]);
      const getVariant = data?.node?.product?.variants?.nodes.find(variant => variant.availableForSale)
      setSelectedVariantId(getVariant.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton
      heading={heading}
    />;
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

function LoadingSkeleton({ heading }) {
  return (
    <BlockStack spacing='loose'>
      <Divider />
      <Heading level={2}>{heading}</Heading>
      <BlockStack spacing='loose'>
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <SkeletonImage aspectRatio={1} />
          <BlockStack spacing='none'>
            <SkeletonText inlineSize='large' />
            <SkeletonText inlineSize='small' />
          </BlockStack>
          <Button kind='secondary' disabled={true}>
            Add
          </Button>
        </InlineLayout>
      </BlockStack>
    </BlockStack>
  );
}

function getProductsOnOffer(lines, products) {
  const cartLineProductVariantIds = lines.map((item) => item.merchandise.id);
  return products.filter((product) => {
    const isProductVariantInCart = product.variants.nodes.some(({ id }) =>
      cartLineProductVariantIds.includes(id)
    );
    return !isProductVariantInCart;
  }).slice(0, 3);
}

function ProductOffer({ products, i18n, adding, handleAddToCart, showError, heading, handleVariants, selectedVariantId, switchPurchase, purchase, selectedPurchaseOption, sellingPlanId }) {
  const imageUrl = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';
  const getVariant = products[0]?.variants?.nodes?.find(variant => variant.id === selectedVariantId)
  const sellingPlanGroups = products[0]?.sellingPlanGroups?.edges[0]?.node
  const sellingPlans = sellingPlanGroups?.sellingPlans?.nodes
  const adjustmentValue = sellingPlans[0]?.priceAdjustments[0]?.adjustmentValue?.adjustmentPercentage

  return (
    <BlockStack spacing='loose'>
      <Divider />
      <Heading level={2}>{heading}</Heading>
      {products.map((product) => (
        <BlockStack spacing='loose'>
          <InlineLayout
            spacing='base'
            columns={[100, 'fill', 'auto']}
            blockAlignment='center'
          >
            <Image
              border='base'
              borderWidth='base'
              borderRadius='loose'
              source={getVariant.image.url ?? imageUrl}
              accessibilityDescription={product.title}
              aspectRatio={1}
            />
            <BlockStack spacing='none'>
              <Text size='medium' emphasis='bold'>
                {product.title}
              </Text>
              <Text appearance='subdued'>{i18n.formatCurrency(getVariant.price.amount)}</Text>
              <BlockStack spacing='base'>
                {product?.variants?.nodes?.length > 1 && (
                  <ToggleButtonGroup
                    spacing='base'
                    value={selectedVariantId}
                    onChange={(value )=> handleVariants(value)}
                  >
                    {product?.variants?.nodes?.map((variant) => (
                      <ToggleButton
                        id={variant.id}
                        spacing='base'
                        disabled={!variant.availableForSale}
                      >
                        <View
                          blockAlignment='center'
                          inlineAlignment='center'
                          minBlockSize='fill'
                        >
                          {variant.title}
                        </View>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
                {sellingPlans?.length && (
                  <View spacing='base'>
                    <BlockStack spacing='base'>
                      <ChoiceList
                        name='Subscribe'
                        value={purchase}
                        onChange={(value )=> switchPurchase(value, sellingPlans[0].id)}
                        spacing='base'
                      >
                        <BlockStack spacing='none'>
                          <Choice id='one-time'>One-time purchase</Choice>
                          <Choice id='subscribe'>Subscribe & save {adjustmentValue}%</Choice>
                        </BlockStack>
                      </ChoiceList>
                      {purchase === 'subscribe' && (
                        <Select
                          label='Purchase options'
                          onChange={(value) =>
                            selectedPurchaseOption(value)
                          }
                          value={sellingPlanId}
                          options={sellingPlans.map((option) => ({
                            label: option.name,
                            value: option.id.toString(),
                          }))}
                        />
                      )}
                    </BlockStack>
                  </View>
                )}
              </BlockStack>
            </BlockStack>
            <Button
              kind='secondary'
              loading={adding}
              accessibilityLabel={`Add ${product.title} to cart`}
              onPress={() => handleAddToCart()}
            >
              Add
            </Button>
          </InlineLayout>
        </BlockStack>
      ))}
      {showError && <ErrorBanner />}
    </BlockStack>
  );
}

function ErrorBanner() {
  return (
    <Banner status='critical'>
      There was an issue adding this product. Please try again.
    </Banner>
  );
}
