(function () {
  const { groupManager, biLogger } = window.pimpMyWolt;
  const allGuests = groupManager.getAllGuests();

  const paymentButtonSettings = {
    settledAttribute: "settled",
  };

  const getPaymentButton = () => document.getElementById("pnlBtnPay");
  const isPaymentButtonExists = () => Boolean(getPaymentButton());
  const isPaymentSettled = () => {
    const paymentButton = getPaymentButton();
    const attribute = paymentButton?.getAttribute(
      paymentButtonSettings.settledAttribute
    );
    return attribute === "true";
  };

  const setPaymentSettled = () => {
    const paymentButton = getPaymentButton();
    paymentButton?.setAttribute(paymentButtonSettings.settledAttribute, "true");
  };

  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
  }

  async function handleCibusPayment() {
    const guests = await allGuests;
    chrome.storage.local.get(
      ["deliveryPrice", "guestsOrders", "orderTimestamp", "restaurant"],
      async ({ deliveryPrice, guestsOrders, orderTimestamp, restaurant }) => {
        if (orderTimestamp + 30 * 1000 < Date.now()) {
          return;
        }
        const guestDeliveryShare = Number(
          (deliveryPrice / guestsOrders.length).toFixed(2)
        );
        const guestDebts = guestsOrders.map((guestOrder) => {
          const cibusName = guests.find(
            (guest) => guest.woltName === guestOrder.name
          )?.cibusName;
          return {
            woltName: guestOrder.name,
            cibusName,
            debt: guestOrder.price + guestDeliveryShare,
          };
        });
        const settledGuests = await setGuestsDebts(guestDebts);
        publishSplitPaymentEvent({
          restaurant,
          settledGuests,
          guestsOrders,
          deliveryPrice,
        });
      }
    );
  }

  async function publishSplitPaymentEvent({
    restaurant,
    settledGuests,
    guestsOrders,
    deliveryPrice,
  }) {
    const currentCibusUser = document.querySelector("#lblMyName").innerText;
    const currentUser =
      (await allGuests).find((guest) => guest.cibusName === currentCibusUser)
        ?.woltName || currentCibusUser;
    biLogger.logEvent("split_payment", {
      restaurant,
      userName: currentUser,
      settledGuests,
      guestsOrders,
      deliveryPrice,
    });
  }

  async function setGuestsDebts(guestDebts) {
    const settledGuests = [];
    for (guestDebt of guestDebts) {
      getElementWithText("label", guestDebt.cibusName)?.click();
    }

    for (guestDebt of guestDebts) {
      const guestInput = await waitForValue(() =>
        getElementWithText("label", guestDebt.cibusName)?.querySelector("input")
      );
      if (guestInput) {
        guestInput.value = guestDebt.debt;
        guestInput.dispatchEvent(
          new UIEvent("change", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
        );
        settledGuests.push({ name: guestDebt.woltName, price: guestDebt.debt });
      }
    }
    return settledGuests;
  }

  function waitForValue(f, attempts = 100) {
    return new Promise((res, rej) => {
      function tryGetValue(attempts) {
        const maybe = f();
        if (attempts === 0 || maybe) res(maybe);
        else {
          setTimeout(() => tryGetValue(attempts - 1), 10);
        }
      }
      tryGetValue(attempts);
    });
  }

  function openSplitPaymentTable() {
    document.querySelector('label[for="cbSplit"]').click();
  }

  setInterval(() => {
    if (isPaymentButtonExists() && !isPaymentSettled()) {
      setPaymentSettled();
      openSplitPaymentTable();
      handleCibusPayment();
    }
  }, 200);
})();
