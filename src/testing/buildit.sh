gcc trng.c -o trng -lgpiod
gcc filter.c -o filter
gcc rng-extractor.c -o rng-extractor
cp ./filter ./transform
