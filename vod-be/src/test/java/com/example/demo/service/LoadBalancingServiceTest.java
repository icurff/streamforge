package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.EServerStatus;
import com.example.demo.model.Server;
import com.example.demo.model.ServerSpecification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class LoadBalancingServiceTest {

    @Mock
    private ServerService serverService;

    @InjectMocks
    private LoadBalancingService loadBalancingService;

    private Server server1;
    private Server server2;
    private Server server3;

    @BeforeEach
    void setUp() {
        // Server 1: Low utilization (best choice)
        server1 = new Server("Server1", "192.168.1.100:9091");
        server1.setStatus(EServerStatus.UP);
        ServerSpecification spec1 = new ServerSpecification();
        spec1.setCpu_usage(20.0);
        spec1.setRam_usage(30.0);
        spec1.setDisk_usage(25.0);
        server1.setSpecification(spec1);

        // Server 2: Medium utilization
        server2 = new Server("Server2", "192.168.1.101:9091");
        server2.setStatus(EServerStatus.UP);
        ServerSpecification spec2 = new ServerSpecification();
        spec2.setCpu_usage(50.0);
        spec2.setRam_usage(60.0);
        spec2.setDisk_usage(40.0);
        server2.setSpecification(spec2);

        // Server 3: High utilization (worst choice)
        server3 = new Server("Server3", "192.168.1.102:9091");
        server3.setStatus(EServerStatus.UP);
        ServerSpecification spec3 = new ServerSpecification();
        spec3.setCpu_usage(80.0);
        spec3.setRam_usage(90.0);
        spec3.setDisk_usage(70.0);
        server3.setSpecification(spec3);
    }

    @Test
    void testGetBestAvailableServer_SelectsServerWithLowestScore() {
        // Arrange
        List<Server> servers = Arrays.asList(server2, server3, server1); // Unordered
        when(serverService.getAllServers()).thenReturn(servers);

        // Act
        Server bestServer = loadBalancingService.getBestAvailableServer();

        // Assert
        assertEquals("Server1", bestServer.getName());
        assertEquals("192.168.1.100:9091", bestServer.getIp());
    }

    @Test
    void testGetBestAvailableServer_ThrowsExceptionWhenNoServersAvailable() {
        // Arrange
        when(serverService.getAllServers()).thenReturn(Collections.emptyList());

        // Act & Assert
        ResourceNotFoundException exception = assertThrows(
            ResourceNotFoundException.class,
            () -> loadBalancingService.getBestAvailableServer()
        );
        
        assertEquals("No available servers to handle the request", exception.getMessage());
    }

    @Test
    void testGetBestAvailableServer_IgnoresDownServers() {
        // Arrange
        server1.setStatus(EServerStatus.DOWN);
        server2.setStatus(EServerStatus.UP);
        server3.setStatus(EServerStatus.DOWN);
        
        List<Server> servers = Arrays.asList(server1, server2, server3);
        when(serverService.getAllServers()).thenReturn(servers);

        // Act
        Server bestServer = loadBalancingService.getBestAvailableServer();

        // Assert
        assertEquals("Server2", bestServer.getName());
    }

    @Test
    void testGetBestAvailableServer_ThrowsExceptionWhenAllServersDown() {
        // Arrange
        server1.setStatus(EServerStatus.DOWN);
        server2.setStatus(EServerStatus.DOWN);
        server3.setStatus(EServerStatus.DOWN);
        
        List<Server> servers = Arrays.asList(server1, server2, server3);
        when(serverService.getAllServers()).thenReturn(servers);

        // Act & Assert
        assertThrows(
            ResourceNotFoundException.class,
            () -> loadBalancingService.getBestAvailableServer()
        );
    }

    @Test
    void testCalculateServerScore_WithCorrectWeights() {
        // Arrange
        Server testServer = new Server("TestServer", "192.168.1.200:9091");
        ServerSpecification spec = new ServerSpecification();
        spec.setCpu_usage(50.0);   // 40% weight
        spec.setRam_usage(60.0);   // 40% weight
        spec.setDisk_usage(30.0);  // 20% weight
        testServer.setSpecification(spec);

        // Expected score: (50 * 0.40) + (60 * 0.40) + (30 * 0.20) = 20 + 24 + 6 = 50.0
        double expectedScore = 50.0;

        // Act
        double actualScore = loadBalancingService.calculateServerScore(testServer);

        // Assert
        assertEquals(expectedScore, actualScore, 0.01);
    }

    @Test
    void testCalculateServerScore_WithZeroUsage() {
        // Arrange
        Server testServer = new Server("TestServer", "192.168.1.200:9091");
        ServerSpecification spec = new ServerSpecification();
        spec.setCpu_usage(0.0);
        spec.setRam_usage(0.0);
        spec.setDisk_usage(0.0);
        testServer.setSpecification(spec);

        // Expected score: 0.0 (completely free server)
        double expectedScore = 0.0;

        // Act
        double actualScore = loadBalancingService.calculateServerScore(testServer);

        // Assert
        assertEquals(expectedScore, actualScore, 0.01);
    }

    @Test
    void testCalculateServerScore_WithMaxUsage() {
        // Arrange
        Server testServer = new Server("TestServer", "192.168.1.200:9091");
        ServerSpecification spec = new ServerSpecification();
        spec.setCpu_usage(100.0);
        spec.setRam_usage(100.0);
        spec.setDisk_usage(100.0);
        testServer.setSpecification(spec);

        // Expected score: (100 * 0.40) + (100 * 0.40) + (100 * 0.20) = 40 + 40 + 20 = 100.0
        double expectedScore = 100.0;

        // Act
        double actualScore = loadBalancingService.calculateServerScore(testServer);

        // Assert
        assertEquals(expectedScore, actualScore, 0.01);
    }

    @Test
    void testCalculateServerScore_HandlesNullMetrics() {
        // Arrange
        Server testServer = new Server("TestServer", "192.168.1.200:9091");
        ServerSpecification spec = new ServerSpecification();
        spec.setCpu_usage(null);
        spec.setRam_usage(null);
        spec.setDisk_usage(null);
        testServer.setSpecification(spec);

        // Expected score: 0.0 (treats null as 0)
        double expectedScore = 0.0;

        // Act
        double actualScore = loadBalancingService.calculateServerScore(testServer);

        // Assert
        assertEquals(expectedScore, actualScore, 0.01);
    }

    @Test
    void testGetAvailableServers_FiltersOnlyUpServers() {
        // Arrange
        server1.setStatus(EServerStatus.UP);
        server2.setStatus(EServerStatus.DOWN);
        server3.setStatus(EServerStatus.UP);
        
        List<Server> allServers = Arrays.asList(server1, server2, server3);
        when(serverService.getAllServers()).thenReturn(allServers);

        // Act
        List<Server> availableServers = loadBalancingService.getAvailableServers();

        // Assert
        assertEquals(2, availableServers.size());
        assertTrue(availableServers.contains(server1));
        assertTrue(availableServers.contains(server3));
        assertFalse(availableServers.contains(server2));
    }

    @Test
    void testGetBestAvailableServer_SelectsBasedOnWeightedScore() {
        // Arrange
        // Server A: High CPU, Low RAM/Disk -> Score = (90*0.4) + (20*0.4) + (20*0.2) = 36 + 8 + 4 = 48
        Server serverA = new Server("ServerA", "192.168.1.103:9091");
        serverA.setStatus(EServerStatus.UP);
        ServerSpecification specA = new ServerSpecification();
        specA.setCpu_usage(90.0);
        specA.setRam_usage(20.0);
        specA.setDisk_usage(20.0);
        serverA.setSpecification(specA);

        // Server B: Low CPU, High RAM/Disk -> Score = (20*0.4) + (90*0.4) + (90*0.2) = 8 + 36 + 18 = 62
        Server serverB = new Server("ServerB", "192.168.1.104:9091");
        serverB.setStatus(EServerStatus.UP);
        ServerSpecification specB = new ServerSpecification();
        specB.setCpu_usage(20.0);
        specB.setRam_usage(90.0);
        specB.setDisk_usage(90.0);
        serverB.setSpecification(specB);

        List<Server> servers = Arrays.asList(serverA, serverB);
        when(serverService.getAllServers()).thenReturn(servers);

        // Act
        Server bestServer = loadBalancingService.getBestAvailableServer();

        // Assert
        // ServerA should be selected because CPU and RAM have higher weights (40% each)
        assertEquals("ServerA", bestServer.getName());
    }
}
