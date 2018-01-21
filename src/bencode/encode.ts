import { JSObject, Indeterminate, Objects, Try } from 'javascriptutilities';
import { Bencodable, BencodablePrimitive } from './types';
import * as Types from './types';

/**
 * Bencode a boolean.
 * @param {boolean} boolean A boolean value.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeBoolean = (boolean: boolean, encoding: Indeterminate<string>): Try<Buffer> => {
  return encodeInt(boolean ? 1 : 0, encoding);
};

/**
 * Bencode an integer.
 * @param {number} number A number value.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodeInt = (number: number, encoding: Indeterminate<string>): Try<Buffer> => {
  if (number < 0) {
    return Try.failure('Integer to be encoded cannot be negative');
  } else if (!Number.isInteger(number)) {
    return Try.failure(`${number} is not an integer`);
  } else {
    return Try.success(Buffer.from('i' + number + 'e', encoding));
  }
};

/**
 * Bencode a string.
 * @param {string} text A string value.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Buffer} A Buffer instance.
 */
export let encodeString = (text: string, encoding: Indeterminate<string>): Buffer => {
  return Buffer.from(text.length + ':' + text, encoding);
};

/**
 * Bencode a primitive value.
 * @param {BencodablePrimitive} primitive A BencodablePrimitive value.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encodePrimitive = (primitive: BencodablePrimitive, encoding: Indeterminate<string>): Try<Buffer> => {
  if (typeof primitive === 'string') {
    return Try.success(encodeString(primitive, encoding));
  } else if (typeof primitive === 'number') {
    return encodeInt(primitive, encoding);
  } else {
    return encodeBoolean(primitive, encoding);
  }
};

/**
 * Bencode an Array.
 * @param {BencodablePrimitive[]} array An Array of BencodablePrimitives.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeArray = (array: BencodablePrimitive[], encoding: Indeterminate<string>): Try<Buffer[]> => {
  let pre = Buffer.from('l', encoding);
  let post = Buffer.from('e', encoding);

  let buffers = array.map(v => encodePrimitive(v, encoding))
    .reduce((v1, v2) => {
      return v1.zipWith(v2, (a, b) => a.concat([b]));
    }, Try.success<Buffer[]>([]));

  return buffers.map(v => [pre].concat(v).concat([post]));
};

/**
 * Bencode a Map.
 * @param {Map<string,BencodablePrimitive>} map A Map instance.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeMap = (map: Map<string,BencodablePrimitive>, encoding: Indeterminate<string>): Try<Buffer[]> => {
  let pre = Buffer.from('d', encoding);
  let post = Buffer.from('e', encoding);
  let keys = Array.from(map.keys()).sort();
  var buffers: Try<Buffer>[] = [];

  for (let key of keys) {
    let value = Try.unwrap(map.get(key), `Missing value for key ${key}`);
    let keyBuffer = encodeString(key, encoding);
    let valueBuffer = value.flatMap(v => encodePrimitive(v, encoding));
    buffers.push(Try.success(keyBuffer));
    buffers.push(valueBuffer);
  }

  let failableBuffers = buffers.reduce((v1, v2) => {
    return v1.zipWith(v2, (a, b) => a.concat([b]));
  }, Try.success<Buffer[]>([]));

  return failableBuffers.map(v => [pre].concat(v).concat(post));
};

/**
 * Bencode a key-value object. 
 * @param {JSObject<BencodablePrimitive>} obj A JSObject instance.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer[]>} A Try Buffer Array instance.
 */
export let encodeKVObject = (obj: JSObject<BencodablePrimitive>, encoding: Indeterminate<string>): Try<Buffer[]> => {
  return encodeMap(Objects.toMap(obj), encoding);
};

/**
 * Bencode an object.
 * @param {Bencodable} obj A Bencodable instance.
 * @param {Indeterminate<string>} encoding Optional encoding, defaults to 'utf-8'.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let encode = (obj: Bencodable, encoding: Indeterminate<string>): Try<Buffer> => {
  var buffers: Try<Buffer[]>;

  if (Types.isBencodablePrimitive(obj)) {
    buffers = encodePrimitive(obj, encoding).map(v => [v]);
  } else if (obj instanceof Array) {
    buffers = encodeArray(obj, encoding);
  } else if (obj instanceof Map) {
    buffers = encodeMap(obj, encoding);
  } else {
    buffers = encodeKVObject(obj, encoding);
  }

  return buffers.map(v => Buffer.concat(v));
};