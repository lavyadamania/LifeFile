class MockPDFDocument {
  on(event: string, callback: (arg: any) => void): void {
    if (event === 'end') {
      setImmediate(() => callback(undefined));
    }
  }

  fontSize(): this {
    return this;
  }

  font(): this {
    return this;
  }

  text(): this {
    return this;
  }

  moveDown(): this {
    return this;
  }

  end(): void {
    // Mock end
  }
}

export default class PDFDocument {
  constructor() {
    return new MockPDFDocument();
  }
}
