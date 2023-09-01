export function getTokenPairsFromPath(path: string[]): string[][] {
  return path.reduce((pairs: string[][], token: string, i: number) => {
    const nextToken = path[i + 1]
    if (nextToken) {
      pairs.push([token, nextToken])
    }
    return pairs;
  }, [])
}

export function getPathFromUniswapV3(fullPath) {
  const fullPathWithoutHexSymbol = fullPath.substring(2);
  const path = [];
  let currentAddress = '';

  for (let i = 0; i < fullPathWithoutHexSymbol.length; i++) {
    currentAddress += fullPathWithoutHexSymbol[i];
    if (currentAddress.length === 40) {
      path.push('0x' + currentAddress);
      i = i + 6;
      currentAddress = '';
    }
  }

  return path;
}