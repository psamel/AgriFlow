# AgriFlow Makefile
# Compatible with GCC on Windows (MinGW-w64 / CodeBlocks / MSYS2) and Linux / WSL

CC = gcc
CFLAGS = -std=c99 -Wall -Wextra -Wpedantic -O2
INCLUDES = -Iinclude
LDFLAGS = -lm

SRC_COMMON = src/plotpool.c src/quadtree.c src/hashmap.c src/minheap.c src/scheduler.c
OBJ_COMMON = src/plotpool.o src/quadtree.o src/hashmap.o src/minheap.o src/scheduler.o

ifeq ($(OS),Windows_NT)
    EXE = .exe
    SO = .dll
    BIN_DIR_CMD = if not exist bin mkdir bin
    CLEAN_CMD = cmd /c "if exist src\*.o del /q src\*.o && if exist tests\*.o del /q tests\*.o && if exist bench\*.o del /q bench\*.o && if exist bin\* del /q bin\*"
else
    EXE =
    SO = .so
    BIN_DIR_CMD = mkdir -p bin
    CLEAN_CMD = rm -f src/*.o tests/*.o bench/*.o bin/*
endif

BIN_APP = bin/agriflow$(EXE)
BIN_TEST = bin/test_all$(EXE)
BIN_BENCH = bin/benchmark$(EXE)
BIN_LIB = bin/agriflow$(SO)

.PHONY: all test bench debug clean run help dirs lib dll

all: dirs $(BIN_APP) $(BIN_LIB)

dirs:
	@$(BIN_DIR_CMD)

src/%.o: src/%.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

tests/%.o: tests/%.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

bench/%.o: bench/%.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

$(BIN_APP): dirs $(OBJ_COMMON) src/main.o
	$(CC) $(CFLAGS) $(INCLUDES) $(OBJ_COMMON) src/main.o -o $@ $(LDFLAGS)

$(BIN_TEST): dirs $(OBJ_COMMON) tests/test_all.o
	$(CC) $(CFLAGS) $(INCLUDES) $(OBJ_COMMON) tests/test_all.o -o $@ $(LDFLAGS)

$(BIN_BENCH): dirs $(OBJ_COMMON) bench/benchmark.o
	$(CC) $(CFLAGS) $(INCLUDES) $(OBJ_COMMON) bench/benchmark.o -o $@ $(LDFLAGS)

$(BIN_LIB): dirs $(OBJ_COMMON) src/agriflow_c_api.o
	$(CC) $(CFLAGS) $(INCLUDES) -shared $(OBJ_COMMON) src/agriflow_c_api.o -o $@ $(LDFLAGS)

lib: dirs $(BIN_LIB)
dll: dirs $(BIN_LIB)

test: dirs $(BIN_TEST)
	@echo [TEST] Executing Automated Test Suite...
	@$(BIN_TEST)

bench: dirs $(BIN_BENCH)
	@echo [BENCH] Executing Benchmark Suite...
	@$(BIN_BENCH)

debug: CFLAGS = -std=c99 -Wall -Wextra -Wpedantic -g -O0
debug: dirs $(BIN_TEST)
	@echo [DEBUG] Executing Debug Test Suite...
	@$(BIN_TEST)

run: $(BIN_APP)
	@$(BIN_APP)

clean:
	@echo Cleaning build artifacts...
	-@$(CLEAN_CMD)

help:
	@echo AgriFlow Build Targets:
	@echo   make all    - Compile main application (bin/agriflow)
	@echo   make test   - Compile and run automated test suite
	@echo   make bench  - Compile and run benchmark suite
	@echo   make debug  - Compile with debug symbols (-g) and run test suite
	@echo   make clean  - Remove object files and executables
