const fs = require("fs");
const axios = require("axios");
const { HttpProxyAgent } = require("http-proxy-agent");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function checkProxy(proxy) {
  const [ip, port, user, pass] = proxy.split(":");
  const proxyUrl = `http://${user}:${pass}@${ip}:${port}`;
  const agent = new HttpProxyAgent(proxyUrl);

  let totalLatency = 0,
    attempts = 5,
    successful = 0;
  for (let i = 0; i < attempts; i++) {
    const start = Date.now();
    try {
      await axios.get("http://www.google.com", {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 5000,
      });
      totalLatency += Date.now() - start;
      successful++;
    } catch (error) {}
  }

  const speed = totalLatency / successful || Infinity;
  let speedStatus =
    speed < 1000 ? "Nhanh" : speed < 3000 ? "Trung bình" : "Chậm";
  const usage = speed < 500 ? "Ít" : speed < 1000 ? "Trung bình" : "Nhiều";

  return {
    proxy,
    status: successful > 0 ? "Sống" : "Chết",
    speed: successful > 0 ? `${speed.toFixed(0)}ms - ${speedStatus}` : "N/A",
    speedMs: speed,
    cleanliness: successful === attempts ? "Sạch" : "Bẩn",
    usage: successful > 0 ? usage : "N/A",
  };
}

async function checkProxiesConcurrently(proxies, concurrencyLimit = 10) {
  const results = [];
  for (let i = 0; i < proxies.length; i += concurrencyLimit) {
    const batch = proxies.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(checkProxy));
    results.push(...batchResults);
    console.log(
      `Đã kiểm tra ${Math.min(i + concurrencyLimit, proxies.length)}/${
        proxies.length
      } proxy...`
    );
  }
  return results;
}

async function main() {
  try {
    const proxies = fs
      .readFileSync("input.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (proxies.length === 0) {
      console.log("Không tìm thấy proxy nào trong input.txt");
      return;
    }

    console.log(`Đang kiểm tra ${proxies.length} proxy...`);
    const results = await checkProxiesConcurrently(proxies);

    results.forEach((result) => {
      console.log(
        `Đã kiểm tra: ${result.proxy} - ${result.status} - ${result.speed} - ${result.cleanliness} - ${result.usage}`
      );
    });

    rl.question(
      "Chọn kiểu output (1: Proxy nhanh, 2: Proxy sống, 3: Proxy sạch): ",
      async (choice) => {
        let filteredResults;
        if (choice === "1") {
          filteredResults = results
            .filter((r) => r.status === "Sống" && r.speedMs < 1000)
            .map((r) => r.proxy);
          console.log("Đã ghi proxy nhanh vào output.txt");
        } else if (choice === "2") {
          filteredResults = results
            .filter((r) => r.status === "Sống")
            .map((r) => r.proxy);
          console.log("Đã ghi tất cả proxy sống vào output.txt");
        } else if (choice === "3") {
          filteredResults = results
            .filter((r) => r.cleanliness === "Sạch")
            .map((r) => r.proxy);
          console.log("Đã ghi proxy sạch vào output.txt");
        } else {
          console.log("Lựa chọn không hợp lệ, ghi toàn bộ kết quả.");
          filteredResults = results.map((r) => r.proxy);
        }
        fs.writeFileSync("output.txt", filteredResults.join("\n"), "utf8");
        fs.writeFileSync(
          "log.txt",
          results
            .map(
              (r) =>
                `${r.proxy} - ${r.status} - ${r.speed} - ${r.cleanliness} - ${r.usage}`
            )
            .join("\n"),
          "utf8"
        );
        rl.close();
        console.log("Hoàn tất!");
      }
    );
  } catch (error) {
    console.error("Lỗi:", error.message);
    rl.close();
  }
}

main();
