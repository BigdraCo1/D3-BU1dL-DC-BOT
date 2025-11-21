import axios, { AxiosError } from "axios";
import { z } from "zod";
import { logger } from "./logger";

const API_BASE_URL = process.env.CONF_SRC || "https://google.com";
const ORIGIN_URL = process.env.ORIGIN_URL || "https://google.com";

/**
 * Fetch sentiment data for a specific crypto ticker
 * @param ticker - Crypto ticker symbol (e.g., BTC, ETH)
 * @param range - Time range for data
 * @param limit - Number of records to fetch
 * @param offset - Pagination offset
 * @returns Validated sentiment data or null on error
 */
export async function fetchSentimentData<T>(
  ticker: string,
  schema: z.ZodSchema<T>,
  range: string,
  limit: number = 100,
  offset: number = 0,
): Promise<T | null> {
  try {
    const url = `${API_BASE_URL}/api/v2/sentiment-crypto/aggregate`;

    logger.debug(
      `Fetching sentiment data for ${ticker} (range: ${range}, limit: ${limit})`,
    );

    const response = await axios.get(url, {
      params: {
        ticker,
        range,
        limit,
        offset,
      },
      timeout: 15000, // 15 second timeout
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "th-TH,th;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Sec-Ch-Ua": '"Not=A?Brand";v="24", "Chromium";v="140"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        Origin: ORIGIN_URL,
        Referer: `${ORIGIN_URL}/`,
      },
    });

    // Validate response data against schema
    try {
      const validatedData = schema.parse(response.data);
      logger.debug(
        `Successfully validated sentiment response for ${ticker}: ${response.data?.data?.length || 0} records`,
      );
      return validatedData;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.error("Sentiment response validation failed:", {
          ticker,
          range,
          errors: validationError.issues,
          receivedData: JSON.stringify(response.data).substring(0, 500),
        });
      } else {
        logger.error("Unknown validation error:", validationError);
      }
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error status
        logger.error("Sentiment API request failed:", {
          ticker,
          range,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
        });
      } else if (axiosError.request) {
        // Request made but no response received
        logger.error("No response received from sentiment API:", {
          ticker,
          range,
          message: axiosError.message,
        });
      } else {
        // Error in request setup
        logger.error("Sentiment API request setup error:", {
          ticker,
          range,
          message: axiosError.message,
        });
      }
    } else {
      logger.error("Unexpected error fetching sentiment data:", error);
    }

    return null;
  }
}
