import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const hasFreeProduct = shopify.lines.value.some((line) => isFreeLine(line));

  if (!hasFreeProduct) {
    return null;
  }

  return (
    <s-banner heading={shopify.i18n.translate("freeProductHeading")} tone="info">
      <s-paragraph>{shopify.i18n.translate("freeProductMessage")}</s-paragraph>
    </s-banner>
  );
}

function isFreeLine(line) {
  if (isFreeAmount(line.cost.totalAmount.amount)) {
    return true;
  }

  return line.lineComponents.some((component) =>
    isFreeAmount(component.cost.totalAmount.amount),
  );
}

function isFreeAmount(amount) {
  return Number(amount) === 0;
}
