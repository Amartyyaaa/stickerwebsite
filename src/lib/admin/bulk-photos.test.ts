import { describe, expect, it } from 'vitest';
import { folderOf, nameFromFile, themeForFolder } from './bulk-photos';

const themes = [
  { id: 'anime', name: 'Anime' },
  { id: 'dark-edgy', name: 'Dark & Edgy' },
  { id: 'tech-code', name: 'Tech & Code' },
  { id: 'jdm', name: 'JDM' },
];

describe('add from photos', () => {
  it('names a product from its file name', () => {
    expect(nameFromFile('kitsune-moon_v2.png')).toBe('Kitsune Moon V2');
    expect(nameFromFile('nightDrive.jpg')).toBe('Night Drive');
    expect(nameFromFile('JDM_touge run (1).webp')).toBe('JDM Touge Run');
    expect(nameFromFile('designs/Anime/spirit fox copy.png')).toBe('Spirit Fox');
    expect(nameFromFile(`${'a'.repeat(120)}.png`)).toHaveLength(80);
  });

  it('reads the folder a file was in', () => {
    expect(folderOf('designs/Anime/fox.png')).toBe('Anime');
    expect(folderOf('Anime/fox.png')).toBe('Anime');
    expect(folderOf('fox.png')).toBe('');
    expect(folderOf('')).toBe('');
  });

  it('matches folders to themes by name or web address, however they’re written', () => {
    expect(themeForFolder('Anime', themes)).toBe('anime');
    expect(themeForFolder('dark & edgy', themes)).toBe('dark-edgy');
    expect(themeForFolder('Dark and Edgy', themes)).toBe('dark-edgy');
    expect(themeForFolder('dark-edgy', themes)).toBe('dark-edgy');
    expect(themeForFolder('TECH_CODE', themes)).toBe('tech-code');
    expect(themeForFolder('jdm', themes)).toBe('jdm');
    expect(themeForFolder('Random stuff', themes)).toBeNull();
    expect(themeForFolder('', themes)).toBeNull();
  });
});
