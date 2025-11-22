// Backwards compatibility shim - re-export new parser registry API
import parsers from './parsers/index';

export const parse = parsers.parse;
export const detectFormat = parsers.detectFormat;
export const registerParser = parsers.registerParser;
export const getParser = parsers.getParser;
export const parseXYZ = parsers.parseXYZ;
export const parsePDB = parsers.parsePDB;

export default parsers;
