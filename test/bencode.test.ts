import { Numbers, Strings } from 'javascriptutilities';
import { Bencode } from './../src';

let encoding = 'utf-8';

describe('Individual bencoding mechanisms should work correctly', () => {
  let times = 1000;

  it('Bencoding strings - should work correctly', () => {
    /// Setup
    Numbers.range(0, times)
      .map(() => Strings.randomString(100).split(''))
      .map(v => v.filter(v1 => v1 !== Bencode.Tokens.delimiter))
      .map(v => v.join(''))
      .forEach(v => {
        /// When
        let encoded = Bencode.Encoder.encode(v, encoding).getOrThrow();
        let bytes = Bencode.Decoder.toByteString(encoded, encoding);
        let decoded = Bencode.Decoder.decodeString(bytes, 0).getOrThrow();
        let value = decoded[0];

        /// Then
        expect(value).toBe(v);
      });
  });
});