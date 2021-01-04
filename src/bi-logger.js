(function () {
  const { groupManager } = window.pimpMyWolt;

  async function logEvent(eventType, eventPayload) {
    const event = {
      group: await groupManager.getTeamName(),
      user_id: await groupManager.getUserId(),
      event_type: eventType,
      event_payload: eventPayload,
    };
    return fetch(
      `https://amitmarx.wixsite.com/pimp-my-wolt/_functions/bi_event`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(event),
      }
    );
  }

  window.pimpMyWolt = {
    ...window.pimpMyWolt,
    biLogger: {
      logEvent,
    },
  };
})();
