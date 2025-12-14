// Test script to check pyramid data extraction
const testGameData = {
  custom: {
    pyramid: [
      { tier: 1, slots: ["item1", "item2", null] },
      { tier: 2, slots: ["item3", null, "item4"] }
    ]
  }
};

const testCachedGame = {
  custom: {
    items: [
      { id: "item1", src: "image1.jpg", label: "Item 1" },
      { id: "item2", src: "image2.jpg", label: "Item 2" }
    ],
    communityItems: [
      { id: "item3", src: "image3.jpg", label: "Item 3" },
      { id: "item4", src: "image4.jpg", label: "Item 4" }
    ]
  }
};

// Simulate the extraction logic
const pyramidStructure = testGameData.custom?.pyramid;
if (pyramidStructure && testCachedGame) {
  const allItems = [...(testCachedGame.custom?.items || []), ...(testCachedGame.custom?.communityItems || [])];
  const pyramidData = pyramidStructure.map((tier) =>
    tier.slots.map((id) => ({
      image: id ? allItems.find((item) => item.id === id) || null : null
    }))
  );
  console.log('Pyramid data result:', JSON.stringify(pyramidData, null, 2));
}
