import { Collections, Numbers, Try } from 'javascriptutilities';
import * as Tokens from './tokens';
import { Bencodable, Encoding } from './types';

/**
 * Convert a buffer to a byte string Array.
 * @param {Buffer} buffer A Buffer instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {string[]} A string Array instance.
 */
export let toByteString = (buffer: Buffer, encoding: Encoding): string[] => {
  return buffer.toString(encoding).split('');
};

/**
 * Decode a bencoded piece of data.
 * @param {Buffer} buffer A Buffer instance.
 * @param {Encoding} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Bencodable>} A Try Bencodable instance.
 */
export let decode = (buffer: Buffer, encoding: Encoding): Try<Bencodable> => {
  return Try.success(buffer)
    .filter(v => v.length >= 0, `Data ${buffer} is empty`)
    .map(v => v.toString(encoding).split(''))
    .map(v => decodeBytes(v))
    .map(() => '');
};

/**
 * Decode an Array of byte string. Note that this method may throw Error, so
 * it should be strictly handled by the main decoding method (whereby it is
 * wrapped in a TryMap selector function). 
 * @param {string[]} bytes A byte string Array.
 * @returns {Try<void>} A Try void instance.
 */
let decodeBytes = (bytes: string[]): Try<void> => {
  let totalCount = bytes.length;
  var offset = 0;

  while (offset < totalCount) {
    let type = Collections.elementAtIndex(bytes, offset).getOrThrow();
    let lastLength: number;
    
    switch (type) {
      case Tokens.dictionary_start:
        let decoded = decodeDictionary(bytes, offset).getOrThrow();
        lastLength = decoded[1];
        break;

      default:
        throw new Error(`Unexpected type token ${type}`);
    }

    offset += lastLength;
  }

  return Try.success(undefined);
};

let decodeDictionary = (bytes: string[], offset: number): Try<[void, number]> => {
  console.log(bytes, offset);
  return Try.success<[void, number]>([undefined, 1]);
};

/**
 * Find the offset position of the next delimiter in order to calculate a
 * bencoded string's length.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {Try<number>} A Try number instance.
 */
let findNextDelimiterOffsetPosition = (bytes: string[], offset: number): Try<number> => {
  try {
    var newOffset = offset;

    while (bytes[newOffset] !== Tokens.delimiter) {
      Try.unwrap(bytes[newOffset]).getOrThrow();
      newOffset += 1;
    }

    return Try.unwrap(newOffset);
  } catch (e) {
    return Try.failure(e);
  }
};

/**
 * Decode the length of the string that is found at the current offset position,
 * as well as the distance from the original offset.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {Try<[number, number]} A Try tuple instance.
 */
let decodeStringLength = (bytes: string[], offset: number): Try<[number, number]> => {
  return findNextDelimiterOffsetPosition(bytes, offset).map((v): [number, number] => {
    return [Number.parseInt(bytes.slice(offset, v).join('')), v];
  });
};

/**
 * Decode the content of a string, after decoding its length, and return it
 * along with the distance from the original offset.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @param {number} length The string's decoded length.
 * @returns {Try<[string, number]>} A Try tuple instance.
 */
let decodeStringContent = (bytes: string[], offset: number, length: number): Try<[string, number]> => {
  return Try.success(bytes)
    .flatMap(v => Collections.elementAtIndex(v, offset))
    .filter(v => v === Tokens.delimiter, 'Incorrect delimiter found')
    .flatMap(() => {
      let startOffset = offset + 1;
      let endOffset = startOffset + length;
      let initial: Try<string[]> = Try.success([]);

      return Numbers.range(startOffset, endOffset)
        .map(v => Collections.elementAtIndex(bytes, v))
        .reduce((v1, v2) => v1.zipWith(v2, (a, b) => a.concat([b])), initial)
        .map(v => v.join(''))
        .map((v): [string, number] => [v, length]);
    });
};

/**
 * Decode a bencoded string and return it along with the distance from the
 * original offset.
 * @param {string[]} bytes A byte string Array.
 * @param {number} offset A number value.
 * @returns {Try<[string, number]>} 
 */
export let decodeString = (bytes: string[], offset: number): Try<[string, number]> => {
  return decodeStringLength(bytes, offset).flatMap(v => {
    let afterLengthOffset = offset + v[1];

    return decodeStringContent(bytes, afterLengthOffset, v[0])
      .map((v1): [string, number] => [v1[0], v1[1] + afterLengthOffset]);
  });
};