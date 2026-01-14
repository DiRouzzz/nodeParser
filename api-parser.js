import puppeteer from "puppeteer";
import fs from "fs";

const args = process.argv.slice(2);
const categoryUrl = args[0];

if (!categoryUrl) {
  console.error("Использование: node api-parser.js <URL категории>");
  console.error(
    "Пример: node api-parser.js https://www.vprok.ru/catalog/7382/pomidory-i-ovoschnye-nabory"
  );
  process.exit(1);
}

console.log(`URL категории: ${categoryUrl}`);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseCategory() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  try {
    const page = await browser.newPage();

    console.log("Загружаю страницу категории...");
    await page.goto(categoryUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await delay(3000);

    console.log("Извлекаю данные из __NEXT_DATA__...");
    const products = await page.evaluate(() => {
      const scriptElement = document.getElementById("__NEXT_DATA__");
      if (!scriptElement) {
        return { error: "__NEXT_DATA__ не найден" };
      }

      try {
        const data = JSON.parse(scriptElement.textContent);
        const catalogPage = data.props?.pageProps?.initialStore?.catalogPage;

        if (!catalogPage || !catalogPage.products) {
          console.log("Список товаров не найден в данных");
          return;
        }

        return { products: catalogPage.products };
      } catch (e) {
        return { error: "Ошибка парсинга JSON: " + e.message };
      }
    });

    console.log(`Найдено товаров: ${products.products.length}`);

    const outputLines = [];

    for (const product of products.products) {
      const lines = [];

      lines.push(`Название товара: ${product.name}`);
      lines.push(`Ссылка на страницу товара: https://www.vprok.ru${product.url}`);
      lines.push(`Рейтинг: ${product.rating || "Нет рейтинга"}`);
      lines.push(`Количество отзывов: ${product.reviews || 0}`);

      if (product.oldPrice && product.oldPrice > 0) {
        lines.push(`Цена: ${product.price} ₽`);
        lines.push(`Акционная цена: ${product.price} ₽`);
        lines.push(`Цена до акции: ${product.oldPrice} ₽`);
        lines.push(`Размер скидки: ${product.discount} ₽ (${product.discountPercent}%)`);
      } else {
        lines.push(`Цена: ${product.price} ₽`);
        lines.push(`Акционная цена: Нет`);
        lines.push(`Цена до акции: Нет`);
        lines.push(`Размер скидки: Нет`);
      }

      outputLines.push(lines.join("\n"));
    }

    const output = outputLines.join("\n\n" + "=".repeat(50) + "\n\n");

    fs.writeFileSync("products-api.txt", output);
    console.log(`Данные сохранены в products-api.txt`);
  } catch (error) {
    console.error("Ошибка:", error.message);
  } finally {
    await browser.close();
  }
}

parseCategory();
